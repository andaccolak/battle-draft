"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FighterView } from "@/lib/game/types";
import { avatarById } from "@/lib/game/avatars";
import { weaponKindFor } from "@/lib/game/items";
import {
  type AnimKey,
  ANIM_KEYS,
  LEGACY_KEYWORDS,
  pickClip,
  gltfLoader,
  loadBase,
  loadAnimClip,
  normalizeSize
} from "@/lib/three/characterAssets";
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

type FighterKind = "blade" | "heavy" | "ranged" | "fists";

const ATTACK_POOLS: Record<FighterKind, AnimKey[]> = {
  blade: ["atk_slash", "atk_heavy"],
  heavy: ["atk_heavy", "atk_slash"],
  ranged: ["atk_shoot", "atk_slash"],
  fists: ["atk_punch", "atk_kick"]
};

function fighterKind(fighter: FighterView): FighterKind {
  const weapon = fighter.equipment.weapon;
  if (!weapon || fighter.disabledItems.includes(weapon.id)) return "fists";
  return weaponKindFor(weapon);
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
    const scale = 11 / width;
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
  actions: Partial<Record<AnimKey, THREE.AnimationAction>>;
  current: THREE.AnimationAction | null;
  base: THREE.Vector3;
  dir: THREE.Vector3;
  side: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetTilt: number;
  returnTimer: ReturnType<typeof setTimeout> | null;
  placeholder: boolean;
}

function makeRig(position: THREE.Vector3, facing: THREE.Vector3): Rig {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = Math.atan2(facing.x, facing.z);
  return {
    group,
    mixer: null,
    actions: {},
    current: null,
    base: position.clone(),
    dir: facing.clone(),
    side: new THREE.Vector3().crossVectors(facing, new THREE.Vector3(0, 1, 0)),
    targetPos: position.clone(),
    targetTilt: 0,
    returnTimer: null,
    placeholder: true
  };
}

function registerClip(rig: Rig, key: AnimKey, clip: THREE.AnimationClip): void {
  if (!rig.mixer || rig.actions[key]) return;
  rig.actions[key] = rig.mixer.clipAction(clip);
  if (key === "idle_stance" && !rig.current) {
    const idle = rig.actions[key];
    if (idle) {
      idle.play();
      rig.current = idle;
    }
  }
}

async function attachModel(rig: Rig, avatarId: string): Promise<void> {
  const base = await loadBase(avatarId);
  if (!base) {
    const placeholder = buildPlaceholder(avatarId);
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
  normalizeSize(instance, 1.75);
  rig.group.add(instance);
  rig.placeholder = false;
  rig.mixer = new THREE.AnimationMixer(instance);
  for (const key of ANIM_KEYS) {
    const clip = pickClip(base.clips, LEGACY_KEYWORDS[key]);
    if (clip) registerClip(rig, key, clip);
  }
  for (const key of ANIM_KEYS) {
    void loadAnimClip(avatarId, key).then((clip) => {
      if (clip) registerClip(rig, key, clip);
    });
  }
}

function playAction(
  rig: Rig,
  candidates: AnimKey[],
  opts: { once?: boolean; backToIdle?: boolean; random?: boolean } = {}
): void {
  if (!rig.mixer) return;
  const available = candidates.filter((key) => rig.actions[key]);
  const pick = opts.random && available.length > 1 ? available[Math.floor(Math.random() * available.length)] : available[0];
  if (!pick) return;
  const target = rig.actions[pick];
  if (!target) return;
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
      const idle = rig.actions.idle_stance;
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
  }, ms);
}

function applyPose(rig: Rig, pose: Pose, kind: FighterKind, crit: boolean): void {
  if (rig.returnTimer) {
    clearTimeout(rig.returnTimer);
    rig.returnTimer = null;
  }
  rig.targetTilt = 0;
  switch (pose) {
    case "idle":
      rig.targetPos.copy(rig.base);
      if (Math.random() < 0.15) playAction(rig, ["idle_taunt"], { once: true, backToIdle: true });
      else playAction(rig, ["idle_stance"]);
      break;
    case "taunt":
      rig.targetPos.copy(rig.base);
      playAction(rig, ["idle_taunt", "idle_stance"], { once: true, backToIdle: true });
      break;
    case "windup":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.4);
      if (rig.actions.charge_up) playAction(rig, ["charge_up"], { once: true });
      else playAction(rig, ["idle_stance"]);
      break;
    case "attack": {
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, 1.15);
      const pool = ATTACK_POOLS[kind];
      if (crit) playAction(rig, ["atk_combo", ...pool], { once: true, backToIdle: true });
      else playAction(rig, pool, { once: true, backToIdle: true, random: kind === "fists" });
      scheduleReturn(rig, 900);
      break;
    }
    case "hit":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.35);
      if (rig.placeholder) rig.targetTilt = -0.25;
      playAction(rig, ["hit_light"], { once: true, backToIdle: true });
      scheduleReturn(rig, 500);
      break;
    case "knockdown":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.6);
      if (rig.placeholder) rig.targetTilt = -0.45;
      playAction(rig, ["hit_knock", "hit_light"], { once: true, backToIdle: true });
      scheduleReturn(rig, 800);
      break;
    case "block":
      rig.targetPos.copy(rig.base).addScaledVector(rig.dir, -0.15);
      if (rig.placeholder) rig.targetTilt = -0.12;
      playAction(rig, ["guard_block", "hit_light"], { once: true, backToIdle: true });
      scheduleReturn(rig, 500);
      break;
    case "dodge":
      rig.targetPos.copy(rig.base).addScaledVector(rig.side, 0.7);
      playAction(rig, ["dodge_step", "dodge_roll"], { once: true, backToIdle: true, random: true });
      scheduleReturn(rig, 600);
      break;
    case "roll":
      rig.targetPos.copy(rig.base).addScaledVector(rig.side, 1);
      playAction(rig, ["dodge_roll", "dodge_step"], { once: true, backToIdle: true });
      scheduleReturn(rig, 700);
      break;
    case "stun":
      rig.targetPos.copy(rig.base);
      if (rig.placeholder) rig.targetTilt = 0.2;
      playAction(rig, ["status_stun", "hit_light"], { once: true, backToIdle: true });
      scheduleReturn(rig, 900);
      break;
    case "revive":
      rig.targetPos.copy(rig.base);
      playAction(rig, ["idle_taunt", "idle_stance"], { once: true, backToIdle: true });
      break;
    case "dead":
      rig.targetPos.copy(rig.base);
      if (rig.placeholder) rig.targetTilt = Math.PI / 2;
      playAction(rig, ["death_fwd", "death_bwd"], { once: true, random: true });
      break;
    case "victory":
      rig.targetPos.copy(rig.base);
      playAction(rig, ["anim_victory"]);
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
  focus: "a" | "b" | "none";
  zoom: boolean;
  crit: boolean;
}

export default function Arena3D({ a, b, poseA, poseB, beat, fx, focus, zoom, crit }: Props) {
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
  const azimuthTarget = useRef(0);
  kindRef.current = { a: fighterKind(a), b: fighterKind(b) };

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

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 3, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    const posA = new THREE.Vector3(-0.72, 0, 1.05);
    const posB = new THREE.Vector3(0.72, 0, -1.05);
    const dirAB = posB.clone().sub(posA).normalize();
    const rigA = makeRig(posA, dirAB);
    const rigB = makeRig(posB, dirAB.clone().negate());
    scene.add(rigA.group);
    scene.add(rigB.group);
    rigARef.current = rigA;
    rigBRef.current = rigB;
    void attachModel(rigA, avatarById(a.avatar).id).then(() => applyPose(rigA, "idle", kindRef.current.a, false));
    void attachModel(rigB, avatarById(b.avatar).id).then(() => applyPose(rigB, "idle", kindRef.current.b, false));

    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    let dragging = false;
    let lastX = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      dom.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      azimuthTarget.current -= (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerUp);
    dom.addEventListener("contextmenu", onContextMenu);

    const clock = new THREE.Clock();
    let frame = 0;
    const orbit = { azimuth: 0, dist: 8, lookX: 0 };
    const lookAt = new THREE.Vector3(0, 0.95, 0);
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const damp = 1 - Math.pow(0.0001, delta);
      for (const rig of [rigA, rigB]) {
        rig.mixer?.update(delta);
        rig.group.position.lerp(rig.targetPos, damp * 0.9);
        rig.group.rotation.z += (rig.targetTilt - rig.group.rotation.z) * damp;
      }
      orbit.azimuth += (azimuthTarget.current - orbit.azimuth) * damp * 0.9;
      orbit.dist += (camTarget.current.z - orbit.dist) * damp * 0.6;
      orbit.lookX += (camTarget.current.x - orbit.lookX) * damp * 0.6;
      camera.position.set(orbit.lookX + Math.sin(orbit.azimuth) * orbit.dist, 3, Math.cos(orbit.azimuth) * orbit.dist);
      lookAt.set(orbit.lookX, 0.95, 0);
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
      baseZ.current = Math.min(12, Math.max(5, 2.15 / Math.tan(halfH)));
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
      dom.removeEventListener("contextmenu", onContextMenu);
      if (rigA.returnTimer) clearTimeout(rigA.returnTimer);
      if (rigB.returnTimer) clearTimeout(rigB.returnTimer);
      arenaRef.current?.removeFromParent();
      arenaRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [a.avatar, b.avatar]);

  useEffect(() => {
    const scene = sceneRef.current;
    const colors = ARENA_COLORS[fx] ?? ARENA_COLORS.none;
    if (!scene || !colors) return;
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.fog, 7, 22);
    const floorMat = floorRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (floorMat) floorMat.color.set(colors.floor);
    const ringMat = ringRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (ringMat) {
      ringMat.color.set(colors.ring);
      ringMat.emissive.set(colors.ring);
    }
    let cancelled = false;
    void loadArenaModel(fx).then((template) => {
      if (cancelled || !template || !sceneRef.current) return;
      arenaRef.current?.removeFromParent();
      const arena = prepareArena(template);
      sceneRef.current.add(arena);
      arenaRef.current = arena;
      if (floorRef.current) floorRef.current.visible = false;
    });
    return () => {
      cancelled = true;
    };
  }, [fx]);

  useEffect(() => {
    if (rigARef.current) applyPose(rigARef.current, poseA, kindRef.current.a, crit);
    if (rigBRef.current) applyPose(rigBRef.current, poseB, kindRef.current.b, crit);
  }, [poseA, poseB, beat, crit]);

  useEffect(() => {
    zoomState.current = { focus, zoom };
    retargetCamera();
  });

  return <div ref={containerRef} className="absolute inset-0" />;
}
