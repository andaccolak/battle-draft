import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type AnimKey =
  | "idle_stance"
  | "idle_taunt"
  | "walk_fwd"
  | "run_fwd"
  | "atk_slash"
  | "atk_heavy"
  | "atk_combo"
  | "atk_punch"
  | "atk_kick"
  | "atk_shoot"
  | "charge_up"
  | "hit_light"
  | "hit_knock"
  | "dodge_step"
  | "dodge_roll"
  | "guard_block"
  | "status_stun"
  | "death_fwd"
  | "death_bwd"
  | "anim_victory";

export const ANIM_KEYS: AnimKey[] = [
  "idle_stance",
  "idle_taunt",
  "walk_fwd",
  "run_fwd",
  "atk_slash",
  "atk_heavy",
  "atk_combo",
  "atk_punch",
  "atk_kick",
  "atk_shoot",
  "charge_up",
  "hit_light",
  "hit_knock",
  "dodge_step",
  "dodge_roll",
  "guard_block",
  "status_stun",
  "death_fwd",
  "death_bwd",
  "anim_victory"
];

export const LEGACY_KEYWORDS: Record<AnimKey, string[]> = {
  idle_stance: ["combat_stance", "stance", "idle", "breathing"],
  idle_taunt: ["taunt", "flex"],
  walk_fwd: ["walk"],
  run_fwd: ["run"],
  atk_slash: ["slash", "sword", "judgment", "attack", "swing"],
  atk_heavy: ["overhead", "heavy"],
  atk_combo: ["combo"],
  atk_punch: ["punch"],
  atk_kick: ["kick"],
  atk_shoot: ["shoot", "bow", "archery"],
  charge_up: ["charge", "power", "cast"],
  hit_light: ["hit", "reaction"],
  hit_knock: ["knockdown", "knock"],
  dodge_step: ["sidestep", "dodge", "step"],
  dodge_roll: ["roll"],
  guard_block: ["block", "parry", "guard"],
  status_stun: ["stun", "dizzy"],
  death_fwd: ["fall_dead", "death", "dead", "dying"],
  death_bwd: ["death_back"],
  anim_victory: ["victory", "cheer", "win"]
};

export function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  for (const track of clip.tracks) {
    if (!track.name.endsWith(".position")) continue;
    const values = track.values;
    if (values.length < 3) continue;
    const x0 = values[0] ?? 0;
    const z0 = values[2] ?? 0;
    for (let i = 0; i + 2 < values.length; i += 3) {
      values[i] = x0;
      values[i + 2] = z0;
    }
  }
  return clip;
}

export function pickClip(clips: THREE.AnimationClip[], keys: string[]): THREE.AnimationClip | null {
  for (const key of keys) {
    const found = clips.find((c) => c.name.toLowerCase().includes(key));
    if (found) return stripRootMotion(found);
  }
  return null;
}

export const gltfLoader = new GLTFLoader();

const baseCache = new Map<string, Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] } | null>>();
const clipCache = new Map<string, Promise<THREE.AnimationClip | null>>();

export function loadBase(avatarId: string): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] } | null> {
  const cached = baseCache.get(avatarId);
  if (cached) return cached;
  const promise = gltfLoader
    .loadAsync(`/models3d/characters/${avatarId}/${avatarId}.glb`)
    .catch(() => gltfLoader.loadAsync(`/models3d/${avatarId}.glb`))
    .then((gltf) => ({ scene: gltf.scene as THREE.Group, clips: gltf.animations }))
    .catch(() => null);
  baseCache.set(avatarId, promise);
  return promise;
}

export function loadAnimClip(avatarId: string, key: AnimKey): Promise<THREE.AnimationClip | null> {
  const cacheKey = `${avatarId}/${key}`;
  const cached = clipCache.get(cacheKey);
  if (cached) return cached;
  const promise = gltfLoader
    .loadAsync(`/models3d/characters/${avatarId}/${avatarId}_${key}.glb`)
    .then((gltf) => {
      const clip = gltf.animations[0];
      return clip ? stripRootMotion(clip) : null;
    })
    .catch(() => null);
  clipCache.set(cacheKey, promise);
  return promise;
}

export function measureHeight(object: THREE.Object3D): { height: number; minY: number } {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  let bones = 0;
  object.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      bones++;
      box.expandByPoint(child.getWorldPosition(point));
    }
  });
  if (bones < 3) box.setFromObject(object);
  return { height: box.max.y - box.min.y, minY: box.min.y };
}

export function normalizeSize(object: THREE.Object3D, targetHeight: number): void {
  const measured = measureHeight(object);
  if (measured.height > 0.0001) {
    const scale = targetHeight / measured.height;
    object.scale.setScalar(scale);
    object.position.y -= measured.minY * scale;
  }
}
