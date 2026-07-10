import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Item } from "@/lib/game/types";
import { weaponModelFor } from "@/lib/game/items";
import { loadBase, loadAnimLibrary, normalizeSize, attachWeapons } from "./characterAssets";

const THUMB_W = 256;
const THUMB_H = 340;

interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  stage: THREE.Group;
}

let studio: Studio | null = null;

function getStudio(): Studio | null {
  if (studio) return studio;
  if (typeof window === "undefined") return null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(THUMB_W, THUMB_H);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, THUMB_W / THUMB_H, 0.1, 20);
  camera.position.set(0, 1.4, 3.9);
  camera.lookAt(0, 0.92, 0);
  const stage = new THREE.Group();
  scene.add(stage);
  studio = { renderer, scene, camera, stage };
  return studio;
}

const thumbCache = new Map<string, Promise<string | null>>();

export function avatarThumb(avatarId: string, weapon?: Item): Promise<string | null> {
  const weaponDef = weaponModelFor(weapon);
  const key = `${avatarId}|${weaponDef ? weaponDef.model + (weaponDef.offhand ?? "") : ""}`;
  const cached = thumbCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const [base, library] = await Promise.all([loadBase(avatarId), loadAnimLibrary()]);
    if (!base) return null;
    const s = getStudio();
    if (!s) return null;
    const instance = cloneSkeleton(base.scene) as THREE.Group;
    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) child.frustumCulled = false;
    });
    normalizeSize(instance, 1.75);
    await attachWeapons(instance, weapon);
    instance.rotation.y = -0.45;
    const mixer = new THREE.AnimationMixer(instance);
    const clip = library.get("Idle_B") ?? base.clips[0];
    if (clip) {
      mixer.clipAction(clip).play();
      mixer.update(0.35);
    }
    s.stage.add(instance);
    s.renderer.render(s.scene, s.camera);
    const url = s.renderer.domElement.toDataURL("image/png");
    s.stage.remove(instance);
    return url;
  })();
  thumbCache.set(key, promise);
  return promise;
}
