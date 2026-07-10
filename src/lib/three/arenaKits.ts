import * as THREE from "three";
import { gltfLoader } from "./characterAssets";

const pieceCache = new Map<string, Promise<THREE.Group | null>>();

function loadPiece(name: string): Promise<THREE.Group | null> {
  const cached = pieceCache.get(name);
  if (cached) return cached;
  const promise = gltfLoader
    .loadAsync(`/models3d/kaykit/dungeon/${name}.glb`)
    .then((gltf) => gltf.scene as THREE.Group)
    .catch(() => null);
  pieceCache.set(name, promise);
  return promise;
}

interface Placement {
  piece: string;
  x: number;
  z: number;
  rotY?: number;
  y?: number;
  scale?: number;
}

const HALF = 20;
const WALL_STEP = 4;

function dungeonLayout(): Placement[] {
  const placements: Placement[] = [];
  for (let x = -HALF + 2; x <= HALF - 2; x += WALL_STEP) {
    for (let z = -HALF + 2; z <= HALF - 2; z += WALL_STEP) {
      placements.push({ piece: "floor_tile_large", x, z, y: -0.05 });
    }
  }
  for (let x = -HALF + 4; x <= HALF - 4; x += WALL_STEP) {
    placements.push({ piece: x === 0 ? "wall_doorway" : "wall", x, z: -HALF, rotY: 0 });
    placements.push({ piece: "wall", x, z: HALF, rotY: Math.PI });
  }
  for (let z = -HALF + 4; z <= HALF - 4; z += WALL_STEP) {
    placements.push({ piece: "wall", x: -HALF, z, rotY: Math.PI / 2 });
    placements.push({ piece: "wall", x: HALF, z, rotY: -Math.PI / 2 });
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      placements.push({ piece: "pillar", x: sx * (HALF - 1.2), z: sz * (HALF - 1.2), scale: 1.35 });
      placements.push({ piece: "pillar", x: sx * 10, z: sz * 10 });
    }
  }
  for (const sx of [-1, 1]) {
    placements.push({ piece: "torch_mounted", x: sx * 8, z: -HALF + 0.55, rotY: 0, y: 2 });
    placements.push({ piece: "torch_mounted", x: sx * 8, z: HALF - 0.55, rotY: Math.PI, y: 2 });
    placements.push({ piece: "torch_mounted", x: -HALF + 0.55, z: sx * 8, rotY: Math.PI / 2, y: 2 });
    placements.push({ piece: "torch_mounted", x: HALF - 0.55, z: sx * 8, rotY: -Math.PI / 2, y: 2 });
  }
  for (const sx of [-1, 1]) {
    placements.push({ piece: "banner_patternA_red", x: sx * 4, z: -HALF + 0.55, rotY: 0 });
    placements.push({ piece: "banner_patternA_red", x: sx * 12, z: HALF - 0.55, rotY: Math.PI });
  }
  placements.push({ piece: "crates_stacked", x: -HALF + 2.4, z: -HALF + 3.2, rotY: 0.5 });
  placements.push({ piece: "barrel_large", x: HALF - 2.2, z: -HALF + 3.4 });
  placements.push({ piece: "barrel_large", x: HALF - 3.6, z: -HALF + 2.6, scale: 0.8 });
  placements.push({ piece: "box_stacked", x: HALF - 2.6, z: HALF - 3 , rotY: -0.4 });
  placements.push({ piece: "chest_gold", x: -HALF + 2.4, z: HALF - 2.8, rotY: 0.9 });
  placements.push({ piece: "rubble_large", x: -HALF + 4.4, z: 14.6, rotY: 1.2, scale: 0.7 });
  return placements;
}

let dungeonTemplate: Promise<THREE.Group | null> | null = null;

async function buildDungeonTemplate(): Promise<THREE.Group | null> {
  const placements = dungeonLayout();
  const names = [...new Set(placements.map((p) => p.piece))];
  const loaded = await Promise.all(names.map((n) => loadPiece(n)));
  const pieces = new Map(names.map((n, i) => [n, loaded[i] ?? null]));
  if (!pieces.get("floor_tile_large") || !pieces.get("wall")) return null;
  const group = new THREE.Group();
  for (const p of placements) {
    const template = pieces.get(p.piece);
    if (!template) continue;
    const instance = template.clone(true);
    instance.position.set(p.x, p.y ?? 0, p.z);
    instance.rotation.y = p.rotY ?? 0;
    if (p.scale) instance.scale.setScalar(p.scale);
    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        if (p.piece !== "floor_tile_large") child.castShadow = true;
      }
    });
    group.add(instance);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const light = new THREE.PointLight(0xffa550, 26, 17, 2);
      light.position.set(sx * 8, 2.9, sz * (HALF - 1.6));
      group.add(light);
    }
  }
  return group;
}

export function buildDungeonArena(): Promise<THREE.Group | null> {
  if (!dungeonTemplate) dungeonTemplate = buildDungeonTemplate();
  return dungeonTemplate.then((template) => (template ? (template.clone(true) as THREE.Group) : null));
}
