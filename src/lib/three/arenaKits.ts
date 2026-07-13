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

const halloweenCache = new Map<string, Promise<THREE.Group | null>>();

function loadHalloweenPiece(name: string): Promise<THREE.Group | null> {
  const cached = halloweenCache.get(name);
  if (cached) return cached;
  const promise = gltfLoader
    .loadAsync(`/models3d/kaykit/halloween/${name}.gltf`)
    .then((gltf) => gltf.scene as THREE.Group)
    .catch(() => null);
  halloweenCache.set(name, promise);
  return promise;
}

function graveyardLayout(): Placement[] {
  const placements: Placement[] = [];
  for (let x = -HALF + 2; x <= HALF - 2; x += 4) {
    for (let z = -HALF + 2; z <= HALF - 2; z += 4) {
      const far = Math.hypot(x, z) > 7;
      const grave = far && (Math.abs(x * 7 + z * 3) % 11 === 0 || Math.abs(x - z) === 12);
      placements.push({ piece: grave ? "floor_dirt_grave" : "floor_dirt", x, z, y: -0.02, rotY: ((x + z) % 8 === 0 ? Math.PI / 2 : 0) });
    }
  }
  for (let x = -HALF + 2; x <= HALF - 2; x += 2) {
    if (Math.abs(x) > 1.5) {
      placements.push({ piece: x === -6 ? "fence_broken" : "fence", x, z: HALF - 0.4, rotY: 0 });
    }
    placements.push({ piece: x === 8 ? "fence_broken" : "fence", x, z: -HALF + 0.4, rotY: Math.PI });
  }
  placements.push({ piece: "fence_gate", x: 0, z: HALF - 0.4, rotY: 0 });
  for (let z = -HALF + 2; z <= HALF - 2; z += 2) {
    placements.push({ piece: z === 4 ? "fence_broken" : "fence", x: -HALF + 0.4, z, rotY: Math.PI / 2 });
    placements.push({ piece: "fence", x: HALF - 0.4, z, rotY: -Math.PI / 2 });
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      placements.push({ piece: "fence_pillar", x: sx * (HALF - 0.5), z: sz * (HALF - 0.5) });
    }
  }
  placements.push({ piece: "crypt", x: 0, z: -HALF + 3.2, rotY: 0, scale: 1.4 });
  placements.push({ piece: "shrine_candles", x: -6.5, z: -HALF + 3, rotY: 0.5 });
  placements.push({ piece: "lantern_standing", x: 5.2, z: -HALF + 3.4 });
  placements.push({ piece: "tree_dead_large", x: -14.5, z: 13.5, rotY: 0.8 });
  placements.push({ piece: "tree_dead_large", x: 15, z: -12.5, rotY: 2.2 });
  placements.push({ piece: "tree_dead_medium", x: 15.5, z: 12, rotY: 4.1 });
  placements.push({ piece: "tree_dead_medium", x: -16, z: -9, rotY: 1.4 });
  const graves: [string, number, number, number][] = [
    ["grave_A", -11, 6, 0.4],
    ["grave_B", -13, -3, 1.2],
    ["gravestone", -9.5, -9.5, 0.9],
    ["grave_A", 11.5, 8, -0.6],
    ["gravestone", 13, 1.5, -1.4],
    ["grave_B", 10, -9, -2.4],
    ["gravemarker_A", -5, 12.5, 0.2],
    ["gravemarker_B", 6.5, 12, -0.3],
    ["gravemarker_A", 8.5, -13.5, 2.8],
    ["gravemarker_B", -7, -13, 3.4]
  ];
  for (const [piece, x, z, rotY] of graves) placements.push({ piece, x, z, rotY });
  for (const sx of [-1, 1]) {
    placements.push({ piece: "post_lantern", x: sx * 8.5, z: HALF - 1.6, rotY: Math.PI });
    placements.push({ piece: "post_lantern", x: sx * 8.5, z: -HALF + 1.6, rotY: 0 });
  }
  placements.push({ piece: "post_skull", x: -2.4, z: HALF - 1.2, rotY: Math.PI });
  placements.push({ piece: "post_skull", x: 2.4, z: HALF - 1.2, rotY: Math.PI });
  placements.push({ piece: "pumpkin_orange_jackolantern", x: -12.5, z: 11, rotY: 2.6 });
  placements.push({ piece: "pumpkin_yellow_small", x: -11.8, z: 11.8, rotY: 1.1 });
  placements.push({ piece: "pumpkin_orange_jackolantern", x: 12.2, z: -6.5, rotY: -2 });
  placements.push({ piece: "skull_candle", x: 6.8, z: 13.2, rotY: 0.7 });
  return placements;
}

let graveyardTemplate: Promise<THREE.Group | null> | null = null;

async function buildGraveyardTemplate(): Promise<THREE.Group | null> {
  const placements = graveyardLayout();
  const names = [...new Set(placements.map((p) => p.piece))];
  const loaded = await Promise.all(names.map((n) => loadHalloweenPiece(n)));
  const pieces = new Map(names.map((n, i) => [n, loaded[i] ?? null]));
  if (!pieces.get("floor_dirt") || !pieces.get("fence")) return null;
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
        if (p.piece !== "floor_dirt" && p.piece !== "floor_dirt_grave") child.castShadow = true;
      }
    });
    group.add(instance);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const light = new THREE.PointLight(0xff9a3d, 22, 15, 2);
      light.position.set(sx * 8.5, 2.6, sz * (HALF - 1.8));
      group.add(light);
    }
  }
  const cryptGlow = new THREE.PointLight(0x86ffb0, 18, 13, 2);
  cryptGlow.position.set(0, 2.2, -HALF + 3.4);
  group.add(cryptGlow);
  return group;
}

export function buildGraveyardArena(): Promise<THREE.Group | null> {
  if (!graveyardTemplate) graveyardTemplate = buildGraveyardTemplate();
  return graveyardTemplate.then((template) => (template ? (template.clone(true) as THREE.Group) : null));
}
