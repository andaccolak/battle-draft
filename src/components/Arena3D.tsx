"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FighterView } from "@/lib/game/types";
import { avatarById } from "@/lib/game/avatars";
import { shieldModelFor, weaponVisualKindFor, type WeaponVisualKind } from "@/lib/game/items";
import type { Item } from "@/lib/game/types";
import { gltfLoader, loadBase, loadAnimLibrary, normalizeSize, attachWeapons } from "@/lib/three/characterAssets";
import { buildDungeonArena } from "@/lib/three/arenaKits";
import type { Pose } from "./Fighter";

interface ArenaColors {
  bg: number;
  floor: number;
  ring: number;
  fog: number;
}

const ARENA_COLORS: Record<string, ArenaColors> = {
  none: { bg: 0x151238, floor: 0x312e81, ring: 0x818cf8, fog: 0x0f172a },
  rain: { bg: 0x0c1929, floor: 0x1e3a5f, ring: 0x60a5fa, fog: 0x0c1929 },
  storm: { bg: 0x0b1220, floor: 0x1e1b4b, ring: 0xa78bfa, fog: 0x0b1220 },
  snow: { bg: 0x334155, floor: 0x7d8ba1, ring: 0xe2e8f0, fog: 0x475569 },
  fog: { bg: 0x2b3646, floor: 0x475569, ring: 0x94a3b8, fog: 0x64748b },
  sun: { bg: 0x7c2d12, floor: 0xb45309, ring: 0xfbbf24, fog: 0x9a3412 },
  night: { bg: 0x020617, floor: 0x1e293b, ring: 0x94a3b8, fog: 0x020617 },
  bloodmoon: { bg: 0x1c0a0a, floor: 0x4a0d0d, ring: 0xef4444, fog: 0x1c0a0a },
  poison: { bg: 0x052e16, floor: 0x14532d, ring: 0x4ade80, fog: 0x052e16 },
  wind: { bg: 0x164e63, floor: 0x155e75, ring: 0x67e8f9, fog: 0x164e63 },
  quake: { bg: 0x292524, floor: 0x44403c, ring: 0xd6d3d1, fog: 0x292524 },
  overcast: { bg: 0x1f2937, floor: 0x374151, ring: 0x9ca3af, fog: 0x1f2937 }
};

type FighterKind = WeaponVisualKind;

const IDLE_CLIP = "Idle_B";

const ATTACK_POOLS: Record<FighterKind, string[]> = {
  blade: ["Melee_1H_Attack_Slice_Diagonal", "Melee_1H_Attack_Slice_Horizontal", "Melee_1H_Attack_Chop", "Melee_1H_Attack_Stab"],
  heavy: ["Melee_2H_Attack_Chop", "Melee_2H_Attack_Slice", "Melee_2H_Attack_Stab"],
  dual: ["Melee_Dualwield_Attack_Chop", "Melee_Dualwield_Attack_Slice", "Melee_Dualwield_Attack_Stab"],
  crossbow: ["Ranged_2H_Shoot", "Ranged_1H_Shoot"],
  magic: ["Ranged_Magic_Shoot"],
  fists: ["Melee_Unarmed_Attack_Punch_A", "Melee_Unarmed_Attack_Kick"]
};

const CRIT_POOL = ["Melee_2H_Attack_Spinning", "Melee_2H_Attack_Spin", "Melee_1H_Attack_Jump_Chop"];
const MELEE_KINDS = new Set<FighterKind>(["blade", "heavy", "dual", "fists"]);
const REACTION_POSES = new Set<Pose>(["hit", "knockdown", "block", "dodge", "roll"]);
const CHAR_HEIGHT = 2.4;
const RUN_SPEED = 5.5;
const WALK_SPEED = 0.55;

const IDLE_POOLS: Partial<Record<FighterKind, string[]>> = {
  fists: ["Melee_Unarmed_Idle", IDLE_CLIP],
  heavy: ["Melee_2H_Idle", IDLE_CLIP]
};

function impactMsFor(kind: FighterKind): number {
  return MELEE_KINDS.has(kind) ? 700 : 560;
}

function activeWeapon(fighter: FighterView): Item | undefined {
  const weapon = fighter.equipment.weapon;
  if (!weapon || fighter.disabledItems.includes(weapon.id)) return undefined;
  return weapon;
}

function fighterKind(fighter: FighterView): FighterKind {
  return weaponVisualKindFor(activeWeapon(fighter));
}

const arenaCache = new Map<string, Promise<THREE.Group | null>>();

function loadArenaTemplate(name: string): Promise<THREE.Group | null> {
  const cached = arenaCache.get(name);
  if (cached) return cached;
  const promise = gltfLoader
    .loadAsync(`/models3d/arena/arena_${name}.glb`)
    .then((gltf) => gltf.scene as THREE.Group)
    .catch(() => null);
  arenaCache.set(name, promise);
  return promise;
}

async function loadArenaModel(fx: string): Promise<THREE.Group | null> {
  if (fx !== "none") {
    const themed = await loadArenaTemplate(fx);
    if (themed) return themed;
  }
  return loadArenaTemplate("base");
}

function prepareArena(template: THREE.Group): THREE.Group {
  const arena = template.clone(true);
  arena.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.receiveShadow = true;
    }
  });
  const box = new THREE.Box3().setFromObject(arena);
  const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  if (width > 0.0001) {
    const scale = 55 / width;
    arena.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    arena.position.set(-center.x * scale, 0, -center.z * scale);
    arena.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(arena, true);
    const firstHit = hits[0];
    if (firstHit) {
      arena.position.y -= firstHit.point.y;
    } else {
      arena.position.y -= box.min.y * scale;
    }
  }
  return arena;
}

interface Weather {
  group: THREE.Group;
  update: (delta: number) => void;
}

function makeParticles(count: number, color: number, size: number, opacity: number, spawn: (i: number) => [number, number, number]): { points: THREE.Points; positions: Float32Array } {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = spawn(i);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, positions };
}

function buildWeather(fx: string): Weather | null {
  const group = new THREE.Group();
  const spread = () => (Math.random() - 0.5) * 13;
  if (fx === "rain" || fx === "storm") {
    const { points, positions } = makeParticles(380, 0x9ec5ff, 0.055, 0.65, () => [spread(), Math.random() * 7, spread()]);
    group.add(points);
    const flash = new THREE.AmbientLight(0xd6e4ff, 0);
    if (fx === "storm") group.add(flash);
    let flashTimer = 2 + Math.random() * 4;
    const update = (delta: number) => {
      for (let i = 1; i < positions.length; i += 3) {
        const y = (positions[i] ?? 0) - 15 * delta;
        positions[i] = y < 0 ? y + 7 : y;
      }
      (points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      if (fx === "storm") {
        flashTimer -= delta;
        if (flashTimer <= 0) {
          flash.intensity = 5;
          flashTimer = 2.5 + Math.random() * 5;
        }
        flash.intensity = Math.max(0, flash.intensity - 18 * delta);
      }
    };
    return { group, update };
  }
  if (fx === "snow") {
    const { points, positions } = makeParticles(260, 0xffffff, 0.085, 0.85, () => [spread(), Math.random() * 6.5, spread()]);
    group.add(points);
    let time = 0;
    const update = (delta: number) => {
      time += delta;
      for (let i = 0; i < positions.length; i += 3) {
        const y = (positions[i + 1] ?? 0) - 1.1 * delta;
        positions[i + 1] = y < 0 ? y + 6.5 : y;
        positions[i] = (positions[i] ?? 0) + Math.sin(time * 1.4 + i) * 0.25 * delta;
      }
      (points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    };
    return { group, update };
  }
  if (fx === "wind") {
    const { points, positions } = makeParticles(220, 0x9beef7, 0.06, 0.5, () => [spread(), 0.2 + Math.random() * 3.4, spread()]);
    group.add(points);
    const update = (delta: number) => {
      for (let i = 0; i < positions.length; i += 3) {
        const x = (positions[i] ?? 0) + 9 * delta;
        positions[i] = x > 7 ? x - 14 : x;
      }
      (points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    };
    return { group, update };
  }
  if (fx === "poison") {
    const { points, positions } = makeParticles(160, 0x4ade80, 0.09, 0.55, () => [spread() * 0.6, Math.random() * 2.8, spread() * 0.6]);
    group.add(points);
    let time = 0;
    const update = (delta: number) => {
      time += delta;
      for (let i = 0; i < positions.length; i += 3) {
        const y = (positions[i + 1] ?? 0) + 0.55 * delta;
        positions[i + 1] = y > 2.8 ? y - 2.8 : y;
        positions[i] = (positions[i] ?? 0) + Math.sin(time + i) * 0.14 * delta;
      }
      (points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    };
    return { group, update };
  }
  return null;
}

function hexNum(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

function buildPlaceholder(avatarId: string): THREE.Group {
  const avatar = avatarById(avatarId);
  const outfit = new THREE.MeshStandardMaterial({ color: hexNum(avatar.outfit), roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: hexNum(avatar.skin), roughness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color: hexNum(avatar.trim), roughness: 0.4, metalness: 0.5 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.3), outfit);
  body.position.y = 0.78;
  group.add(body);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.32), trim);
  belt.position.y = 0.5;
  group.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 16), skin);
  head.position.y = 1.44;
  group.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 12, 0, Math.PI * 2, 0, 1.2), trim);
  helm.position.y = 1.5;
  group.add(helm);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), outfit);
    leg.position.set(side * 0.14, 0.21, 0);
    group.add(leg);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), skin);
    fist.position.set(side * 0.2, 1.1 + (side > 0 ? 0.1 : 0), 0.3);
    group.add(fist);
  }
  return group;
}

interface Rig {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  clips: Map<string, THREE.AnimationClip> | null;
  actions: Record<string, THREE.AnimationAction>;
  current: THREE.AnimationAction | null;
  base: THREE.Vector3;
  dir: THREE.Vector3;
  side: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetTilt: number;
  returnTimer: ReturnType<typeof setTimeout> | null;
  actionTimer: ReturnType<typeof setTimeout> | null;
  reactTimer: ReturnType<typeof setTimeout> | null;
  placeholder: boolean;
  marker: THREE.MeshBasicMaterial | null;
  moveSpeed: number | null;
  idleClip: string;
}

interface Projectile {
  mesh: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  elapsed: number;
  duration: number;
}

const cameraState = { azimuth: 0, elev: 3, zoom: 1 };

function attachMarker(rig: Rig, color: number): void {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.78, 32), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  rig.group.add(ring);
  rig.marker = mat;
}

function attachNameSprite(rig: Rig, name: string, color: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(name.slice(0, 12), 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.9, 0.475, 1);
  sprite.position.y = 2.95;
  sprite.renderOrder = 5;
  rig.group.add(sprite);
}

function makeRig(position: THREE.Vector3, facing: THREE.Vector3): Rig {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = Math.atan2(facing.x, facing.z);
  return {
    group,
    mixer: null,
    clips: null,
    actions: {},
    current: null,
    base: position.clone(),
    dir: facing.clone(),
    side: new THREE.Vector3().crossVectors(facing, new THREE.Vector3(0, 1, 0)),
    targetPos: position.clone(),
    targetTilt: 0,
    returnTimer: null,
    actionTimer: null,
    reactTimer: null,
    placeholder: true,
    marker: null,
    moveSpeed: null,
    idleClip: IDLE_CLIP
  };
}

async function attachModel(rig: Rig, avatarId: string, weapon: Item | undefined, shieldModel: string | undefined): Promise<void> {
  const [base, library] = await Promise.all([loadBase(avatarId), loadAnimLibrary()]);
  if (!base) {
    const placeholder = buildPlaceholder(avatarId);
    placeholder.scale.setScalar(CHAR_HEIGHT / 1.75);
    rig.group.add(placeholder);
    return;
  }
  const instance = cloneSkeleton(base.scene) as THREE.Group;
  instance.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.frustumCulled = false;
    }
  });
  normalizeSize(instance, CHAR_HEIGHT);
  await attachWeapons(instance, weapon, shieldModel);
  rig.group.add(instance);
  rig.placeholder = false;
  rig.mixer = new THREE.AnimationMixer(instance);
  rig.clips = new Map(library);
  for (const clip of base.clips) {
    if (!rig.clips.has(clip.name)) rig.clips.set(clip.name, clip);
  }
}

function getAction(rig: Rig, name: string): THREE.AnimationAction | null {
  const existing = rig.actions[name];
  if (existing) return existing;
  if (!rig.mixer || !rig.clips) return null;
  const clip = rig.clips.get(name);
  if (!clip) return null;
  const action = rig.mixer.clipAction(clip);
  rig.actions[name] = action;
  return action;
}

function pickAvailable(rig: Rig, candidates: string[], random: boolean): string | null {
  const available = candidates.filter((name) => rig.clips?.has(name));
  if (available.length === 0) return null;
  const pick = random && available.length > 1 ? available[Math.floor(Math.random() * available.length)] : available[0];
  return pick ?? null;
}

function playAction(
  rig: Rig,
  candidates: string[],
  opts: { once?: boolean; backToIdle?: boolean; random?: boolean } = {}
): void {
  if (!rig.mixer) return;
  const pick = pickAvailable(rig, candidates, !!opts.random);
  if (!pick) return;
  const target = getAction(rig, pick);
  if (!target) return;
  if (!opts.once && rig.current === target && target.isRunning()) return;
  const fade = 0.22;
  target.reset();
  if (opts.once) {
    target.setLoop(THREE.LoopOnce, 1);
    target.clampWhenFinished = true;
  } else {
    target.setLoop(THREE.LoopRepeat, Infinity);
  }
  if (rig.current && rig.current !== target) rig.current.fadeOut(fade);
  target.fadeIn(fade).play();
  rig.current = target;
  if (opts.once && opts.backToIdle) {
    const mixer = rig.mixer;
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== target) return;
      mixer.removeEventListener("finished", onFinished as never);
      const idle = getAction(rig, rig.idleClip) ?? getAction(rig, IDLE_CLIP);
      if (idle && rig.current === target) {
        idle.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.3).play();
        target.fadeOut(0.3);
        rig.current = idle;
      }
    };
    mixer.addEventListener("finished", onFinished as never);
  }
}

function scheduleReturn(rig: Rig, ms: number): void {
  if (rig.returnTimer) clearTimeout(rig.returnTimer);
  rig.returnTimer = setTimeout(() => {
    rig.targetPos.copy(rig.base);
    rig.targetTilt = 0;
    rig.moveSpeed = null;
  }, ms);
}

function applyPose(rig: Rig, pose: Pose, kind: FighterKind, crit: boolean, onShoot?: () => void): void {
  if (rig.returnTimer) {
    clearTimeout(rig.returnTimer);
    rig.returnTimer = null;
  }
  if (rig.actionTimer) {
    clearTimeout(rig.actionTimer);
    rig.actionTimer = null;
  }
  rig.targetTilt = 0;
  rig.moveSpeed = null;
  rig.idleClip = pickAvailable(rig, IDLE_POOLS[kind] ?? [IDLE_CLIP], false) ?? IDLE_CLIP;
  switch (pose) {
    case "idle":
      rig.targetPos.copy(rig.base);
      playAction(rig, [rig.idleClip]);
      break;
    case "guard":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.25);
      playAction(rig, ["Melee_Blocking", "Melee_Block", IDLE_CLIP]);
      break;
    case "taunt":
      rig.targetPos.copy(rig.base);
      playAction(rig, ["Skeletons_Taunt", IDLE_CLIP], { once: true, backToIdle: true });
      break;
    case "windup":
      if (kind === "magic") {
        rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.4);
        playAction(rig, ["Ranged_Magic_Raise", IDLE_CLIP], { once: true, backToIdle: true });
      } else if (kind === "crossbow") {
        rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.4);
        playAction(rig, ["Ranged_2H_Aiming", "Ranged_1H_Aiming", IDLE_CLIP]);
      } else if (rig.clips?.has("Walking_A")) {
        rig.targetPos.copy(rig.base).addScaledVector(rig.dir, 1.0);
        rig.moveSpeed = WALK_SPEED;
        playAction(rig, ["Walking_A"]);
      } else {
        rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.4);
        playAction(rig, [rig.idleClip]);
      }
      break;
    case "attack": {
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, MELEE_KINDS.has(kind) ? 1.7 : 0.2);
      const pool = ATTACK_POOLS[kind];
      const strike =
        crit && MELEE_KINDS.has(kind)
          ? (pickAvailable(rig, CRIT_POOL, true) ?? pickAvailable(rig, pool, true))
          : pickAvailable(rig, pool, true);
      if (strike && MELEE_KINDS.has(kind) && rig.clips?.has("Running_A")) {
        rig.moveSpeed = RUN_SPEED;
        playAction(rig, ["Running_A"]);
        rig.actionTimer = setTimeout(() => {
          rig.moveSpeed = null;
          playAction(rig, [strike], { once: true, backToIdle: true });
        }, 320);
      } else if (strike) {
        playAction(rig, [strike], { once: true, backToIdle: true });
        if (!MELEE_KINDS.has(kind) && onShoot) rig.actionTimer = setTimeout(onShoot, 320);
      }
      scheduleReturn(rig, 1100);
      break;
    }
    case "hit":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.35);
      if (rig.placeholder) rig.targetTilt = -0.25;
      playAction(rig, ["Hit_A"], { once: true, backToIdle: true });
      scheduleReturn(rig, 500);
      break;
    case "knockdown":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.6);
      if (rig.placeholder) rig.targetTilt = -0.45;
      playAction(rig, ["Hit_B", "Hit_A"], { once: true, backToIdle: true });
      scheduleReturn(rig, 800);
      break;
    case "block":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.15);
      if (rig.placeholder) rig.targetTilt = -0.12;
      playAction(rig, ["Melee_Block_Hit", "Hit_A"], { once: true, backToIdle: true });
      scheduleReturn(rig, 500);
      break;
    case "dodge":
      rig.targetPos.copy(rig.base).addScaledVector(rig.side, 0.7);
      playAction(rig, ["Dodge_Left", "Dodge_Right"], { once: true, backToIdle: true, random: true });
      scheduleReturn(rig, 600);
      break;
    case "roll":
      rig.targetPos.copy(rig.base).addScaledVector(rig.side, 1);
      playAction(rig, ["Dodge_Backward", "Dodge_Forward", "Dodge_Left"], { once: true, backToIdle: true, random: true });
      scheduleReturn(rig, 700);
      break;
    case "stun":
      rig.targetPos.copy(rig.base);
      if (rig.placeholder) rig.targetTilt = 0.2;
      playAction(rig, ["Hit_B", "Hit_A"], { once: true, backToIdle: true });
      scheduleReturn(rig, 900);
      break;
    case "revive":
      rig.targetPos.copy(rig.base);
      playAction(rig, ["Skeletons_Death_Resurrect", "Skeletons_Taunt"], { once: true, backToIdle: true });
      break;
    case "dead":
      rig.targetPos.copy(rig.base);
      if (rig.placeholder) rig.targetTilt = Math.PI / 2;
      playAction(rig, ["Death_A", "Death_B"], { once: true, random: true });
      break;
    case "victory":
      rig.targetPos.copy(rig.base);
      playAction(rig, ["Cheering"]);
      break;
  }
}

interface Props {
  a: FighterView;
  b: FighterView;
  poseA: Pose;
  poseB: Pose;
  beat: number;
  fx: string;
  map: string;
  focus: "a" | "b" | "none";
  zoom: boolean;
  crit: boolean;
}

export default function Arena3D({ a, b, poseA, poseB, beat, fx, map, focus, zoom, crit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rigARef = useRef<Rig | null>(null);
  const rigBRef = useRef<Rig | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const floorRef = useRef<THREE.Mesh | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const arenaRef = useRef<THREE.Group | null>(null);
  const camTarget = useRef({ x: 0, z: 6 });
  const baseZ = useRef(6);
  const zoomState = useRef({ focus: "none" as "a" | "b" | "none", zoom: false });
  const kindRef = useRef({ a: "fists" as FighterKind, b: "fists" as FighterKind });
  const weatherRef = useRef<Weather | null>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const mapRef = useRef(map);
  kindRef.current = { a: fighterKind(a), b: fighterKind(b) };
  mapRef.current = map;

  const spawnProjectile = (from: Rig, to: Rig, kind: FighterKind) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const mesh =
      kind === "magic"
        ? new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.95 })
          )
        : new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0x8a6d4a, roughness: 0.6 }));
    const start = from.group.position.clone().setY(1.5).addScaledVector(from.dir, 0.6);
    const end = to.group.position.clone().setY(1.35);
    mesh.position.copy(start);
    mesh.lookAt(end);
    scene.add(mesh);
    projectilesRef.current.push({ mesh, from: start, to: end, elapsed: 0, duration: 0.22 });
  };

  const retargetCamera = () => {
    const { focus: f, zoom: z } = zoomState.current;
    camTarget.current.x = f === "a" ? -0.45 : f === "b" ? 0.45 : 0;
    camTarget.current.z = baseZ.current - (z ? 1.2 : f !== "none" ? 0.6 : 0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 95);
    camera.position.set(0, 3, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(3, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    scene.add(sun);
    const rim = new THREE.PointLight(0x8899ff, 12, 20);
    rim.position.set(-3, 3, -3);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.9, 0.28, 48),
      new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.9 })
    );
    floor.position.y = -0.14;
    floor.receiveShadow = true;
    scene.add(floor);
    floorRef.current = floor;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.6, 0.05, 10, 64),
      new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x818cf8, emissiveIntensity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
    ringRef.current = ring;

    const posA = new THREE.Vector3(-0.9, 0, 1.3);
    const posB = new THREE.Vector3(0.9, 0, -1.3);
    const dirAB = posB.clone().sub(posA).normalize();
    const rigA = makeRig(posA, dirAB);
    const rigB = makeRig(posB, dirAB.clone().negate());
    scene.add(rigA.group);
    scene.add(rigB.group);
    rigARef.current = rigA;
    rigBRef.current = rigB;
    attachMarker(rigA, 0x818cf8);
    attachMarker(rigB, 0xf87171);
    attachNameSprite(rigA, a.nickname, "#a5b4fc");
    attachNameSprite(rigB, b.nickname, "#fca5a5");
    void attachModel(rigA, avatarById(a.avatar).id, activeWeapon(a), shieldModelFor(a.equipment, a.disabledItems)).then(() =>
      applyPose(rigA, "idle", kindRef.current.a, false)
    );
    void attachModel(rigB, avatarById(b.avatar).id, activeWeapon(b), shieldModelFor(b.equipment, b.disabledItems)).then(() =>
      applyPose(rigB, "idle", kindRef.current.b, false)
    );

    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const clampZoom = (v: number) => Math.min(2.8, Math.max(0.55, v));
    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dom.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        if (p1 && p2) pinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 1) {
        cameraState.azimuth -= (e.clientX - p.x) * 0.008;
        cameraState.elev = Math.min(6.5, Math.max(1.2, cameraState.elev + (e.clientY - p.y) * 0.015));
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        if (p1 && p2) {
          const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (pinchDist > 0 && d > 0) cameraState.zoom = clampZoom(cameraState.zoom * (pinchDist / d));
          pinchDist = d;
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinchDist = 0;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraState.zoom = clampZoom(cameraState.zoom * (1 + e.deltaY * 0.001));
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", onContextMenu);

    const clock = new THREE.Clock();
    let frame = 0;
    const orbit = { azimuth: cameraState.azimuth, dist: 8, lookX: 0, elev: cameraState.elev };
    const lookAt = new THREE.Vector3(0, 1.15, 0);
    const moveVec = new THREE.Vector3();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const damp = 1 - Math.pow(0.0001, delta);
      for (const rig of [rigA, rigB]) {
        rig.mixer?.update(delta);
        if (rig.moveSpeed) {
          moveVec.subVectors(rig.targetPos, rig.group.position);
          const remaining = moveVec.length();
          if (remaining > 0.02) {
            rig.group.position.addScaledVector(moveVec.normalize(), Math.min(rig.moveSpeed * delta, remaining));
          }
        } else {
          rig.group.position.lerp(rig.targetPos, damp * 0.9);
        }
        rig.group.rotation.z += (rig.targetTilt - rig.group.rotation.z) * damp;
      }
      const projectiles = projectilesRef.current;
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p) continue;
        p.elapsed += delta;
        const t = Math.min(1, p.elapsed / p.duration);
        p.mesh.position.lerpVectors(p.from, p.to, t);
        if (t >= 1) {
          p.mesh.removeFromParent();
          projectiles.splice(i, 1);
        }
      }
      weatherRef.current?.update(delta);
      orbit.azimuth += (cameraState.azimuth - orbit.azimuth) * damp * 0.9;
      orbit.elev += (cameraState.elev - orbit.elev) * damp * 0.9;
      const maxDist = mapRef.current === "dungeon" ? 18 : 34;
      orbit.dist += (Math.min(maxDist, camTarget.current.z * cameraState.zoom) - orbit.dist) * damp * 0.6;
      orbit.lookX += (camTarget.current.x - orbit.lookX) * damp * 0.6;
      camera.position.set(orbit.lookX + Math.sin(orbit.azimuth) * orbit.dist, orbit.elev, Math.cos(orbit.azimuth) * orbit.dist);
      lookAt.set(orbit.lookX, 1.15, 0);
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect);
      baseZ.current = Math.min(12, Math.max(4.2, 1.35 / Math.tan(halfH)));
      retargetCamera();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointercancel", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("contextmenu", onContextMenu);
      weatherRef.current?.group.removeFromParent();
      weatherRef.current = null;
      if (rigA.returnTimer) clearTimeout(rigA.returnTimer);
      if (rigB.returnTimer) clearTimeout(rigB.returnTimer);
      if (rigA.actionTimer) clearTimeout(rigA.actionTimer);
      if (rigB.actionTimer) clearTimeout(rigB.actionTimer);
      if (rigA.reactTimer) clearTimeout(rigA.reactTimer);
      if (rigB.reactTimer) clearTimeout(rigB.reactTimer);
      for (const p of projectilesRef.current) p.mesh.removeFromParent();
      projectilesRef.current = [];
      arenaRef.current?.removeFromParent();
      arenaRef.current = null;
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [a.avatar, b.avatar, a.equipment.weapon?.id, b.equipment.weapon?.id]);

  useEffect(() => {
    const scene = sceneRef.current;
    const colors = ARENA_COLORS[fx] ?? ARENA_COLORS.none;
    if (!scene || !colors) return;
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.fog, 12, 62);
    const floorMat = floorRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (floorMat) floorMat.color.set(colors.floor);
    const ringMat = ringRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (ringMat) {
      ringMat.color.set(colors.ring);
      ringMat.emissive.set(colors.ring);
    }
    weatherRef.current?.group.removeFromParent();
    const weather = buildWeather(fx);
    weatherRef.current = weather;
    if (weather) scene.add(weather.group);
    let cancelled = false;
    const arenaPromise =
      map === "dungeon"
        ? buildDungeonArena()
        : loadArenaModel(fx).then((template) => (template ? prepareArena(template) : null));
    void arenaPromise.then((arena) => {
      if (cancelled || !arena || !sceneRef.current) return;
      arenaRef.current?.removeFromParent();
      sceneRef.current.add(arena);
      arenaRef.current = arena;
      if (floorRef.current) floorRef.current.visible = false;
    });
    return () => {
      cancelled = true;
    };
  }, [fx, map]);

  useEffect(() => {
    const rigA = rigARef.current;
    const rigB = rigBRef.current;
    if (!rigA || !rigB) return;
    for (const rig of [rigA, rigB]) {
      if (rig.reactTimer) {
        clearTimeout(rig.reactTimer);
        rig.reactTimer = null;
      }
    }
    const kinds = kindRef.current;
    const delayReaction = (attacker: Rig, attackerKind: FighterKind, defender: Rig, reaction: Pose, defenderKind: FighterKind) => {
      applyPose(attacker, "attack", attackerKind, crit, () => spawnProjectile(attacker, defender, attackerKind));
      const lead = reaction === "dodge" || reaction === "roll" ? 260 : 0;
      defender.reactTimer = setTimeout(() => applyPose(defender, reaction, defenderKind, false), Math.max(120, impactMsFor(attackerKind) - lead));
    };
    if (poseA === "attack" && REACTION_POSES.has(poseB)) {
      delayReaction(rigA, kinds.a, rigB, poseB, kinds.b);
    } else if (poseB === "attack" && REACTION_POSES.has(poseA)) {
      delayReaction(rigB, kinds.b, rigA, poseA, kinds.a);
    } else {
      if (poseA === "attack") applyPose(rigA, "attack", kinds.a, crit, () => spawnProjectile(rigA, rigB, kinds.a));
      else applyPose(rigA, poseA, kinds.a, crit);
      if (poseB === "attack") applyPose(rigB, "attack", kinds.b, crit, () => spawnProjectile(rigB, rigA, kinds.b));
      else applyPose(rigB, poseB, kinds.b, crit);
    }
  }, [poseA, poseB, beat, crit]);

  useEffect(() => {
    zoomState.current = { focus, zoom };
    retargetCamera();
    const markerA = rigARef.current?.marker;
    const markerB = rigBRef.current?.marker;
    if (markerA) markerA.opacity = focus === "a" ? 0.85 : 0.15;
    if (markerB) markerB.opacity = focus === "b" ? 0.85 : 0.15;
  });

  return <div ref={containerRef} className="absolute inset-0" />;
}
