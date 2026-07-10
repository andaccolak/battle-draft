const apiKey = process.env.MESHY_API_KEY;
const [, , outputName, ...promptParts] = process.argv;
const prompt = promptParts.join(" ");

if (!apiKey || !outputName || !prompt) {
  console.error("Usage: MESHY_API_KEY=... node meshy-generate.mjs <output_name> <prompt...>");
  console.error('Example: MESHY_API_KEY=msy_xxx node meshy-generate.mjs character_blaze "low-poly stylized warrior with spiky red hair, red leather armor, game character, T-pose"');
  process.exit(1);
}

const base = "https://api.meshy.ai/openapi/v2/text-to-3d";
const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

async function createTask(body) {
  const res = await fetch(base, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Meshy error ${res.status}: ${JSON.stringify(json)}`);
  return json.result;
}

async function waitForTask(id) {
  for (;;) {
    const res = await fetch(`${base}/${id}`, { headers });
    const task = await res.json();
    if (task.status === "SUCCEEDED") return task;
    if (task.status === "FAILED" || task.status === "CANCELED") {
      throw new Error(`Task ${id} ${task.status}: ${task.task_error?.message ?? ""}`);
    }
    process.stdout.write(`\r${task.status} ${task.progress ?? 0}%   `);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

console.log(`Creating preview task for "${outputName}"...`);
const previewId = await createTask({ mode: "preview", prompt, art_style: "sculpture", should_remesh: true });
await waitForTask(previewId);
console.log("\nPreview done. Refining (this takes a few minutes)...");
const refineId = await createTask({ mode: "refine", preview_task_id: previewId, enable_pbr: true });
const refined = await waitForTask(refineId);

const url = refined.model_urls?.usdz ?? refined.model_urls?.glb;
if (!url) throw new Error(`No downloadable model URL in task result: ${JSON.stringify(refined.model_urls)}`);
const ext = refined.model_urls?.usdz ? "usdz" : "glb";
const outPath = new URL(`../BattleDraft/Resources/Models3D/${outputName}.${ext}`, import.meta.url).pathname;

const download = await fetch(url);
const buffer = Buffer.from(await download.arrayBuffer());
const { writeFileSync } = await import("node:fs");
writeFileSync(outPath, buffer);
console.log(`\nSaved ${outPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
if (ext === "glb") {
  console.log("NOTE: got GLB, not USDZ. Convert with Apple Reality Converter before the app can load it.");
}
