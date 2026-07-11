"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loadBase, loadAnimLibrary, normalizeSize } from "@/lib/three/characterAssets";

interface Props {
  avatarId: string;
  className?: string;
}

export default function Avatar3DThumb({ avatarId, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 1.35, 4.4);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(2, 4, 3);
    scene.add(sun);

    const holder = new THREE.Group();
    scene.add(holder);
    let mixer: THREE.AnimationMixer | null = null;

    void Promise.all([loadBase(avatarId), loadAnimLibrary()]).then(([base, library]) => {
      if (!base || disposed) return;
      const instance = cloneSkeleton(base.scene) as THREE.Group;
      instance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) child.frustumCulled = false;
      });
      normalizeSize(instance, 1.75);
      holder.add(instance);
      mixer = new THREE.AnimationMixer(instance);
      const clip = library.get("Idle_B") ?? base.clips[0];
      if (clip) mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
    });

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      mixer?.update(delta);
      holder.rotation.y += delta * 0.7;
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [avatarId]);

  return <div ref={containerRef} className={className} />;
}
