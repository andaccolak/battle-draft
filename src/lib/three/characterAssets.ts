import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KAYKIT_MODELS } from "@/lib/game/avatars";

export const gltfLoader = new GLTFLoader();

const ANIM_LIBS = ["General", "MovementBasic", "MovementAdvanced", "CombatMelee", "CombatRanged", "Special", "Simulation"];

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

const baseCache = new Map<string, Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] } | null>>();

export function loadBase(avatarId: string): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] } | null> {
  const cached = baseCache.get(avatarId);
  if (cached) return cached;
  const model = KAYKIT_MODELS[avatarId];
  const first = model
    ? gltfLoader.loadAsync(`/models3d/kaykit/characters/${model}.glb`)
    : gltfLoader.loadAsync(`/models3d/characters/${avatarId}/${avatarId}.glb`);
  const promise = first
    .catch(() => gltfLoader.loadAsync(`/models3d/${avatarId}.glb`))
    .then((gltf) => ({ scene: gltf.scene as THREE.Group, clips: gltf.animations }))
    .catch(() => null);
  baseCache.set(avatarId, promise);
  return promise;
}

let libraryPromise: Promise<Map<string, THREE.AnimationClip>> | null = null;

export function loadAnimLibrary(): Promise<Map<string, THREE.AnimationClip>> {
  if (libraryPromise) return libraryPromise;
  libraryPromise = Promise.all(
    ANIM_LIBS.map((lib) =>
      gltfLoader
        .loadAsync(`/models3d/kaykit/anims/Rig_Medium_${lib}.glb`)
        .then((gltf) => gltf.animations)
        .catch(() => [] as THREE.AnimationClip[])
    )
  ).then((groups) => {
    const map = new Map<string, THREE.AnimationClip>();
    for (const clips of groups) {
      for (const clip of clips) {
        if (!map.has(clip.name)) map.set(clip.name, stripRootMotion(clip));
      }
    }
    return map;
  });
  return libraryPromise;
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
