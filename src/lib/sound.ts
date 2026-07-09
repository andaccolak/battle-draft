"use client";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gain.gain.setValueAtTime(volume, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration);
}

export const sfx = {
  hit(): void {
    tone(160, 0.12, "square", 0.12);
    tone(90, 0.15, "sawtooth", 0.1, 0.02);
  },
  crit(): void {
    tone(120, 0.2, "sawtooth", 0.18);
    tone(500, 0.1, "square", 0.12, 0.04);
    tone(70, 0.3, "sawtooth", 0.15, 0.06);
  },
  miss(): void {
    tone(300, 0.15, "sine", 0.08);
    tone(220, 0.15, "sine", 0.06, 0.08);
  },
  heal(): void {
    tone(520, 0.15, "sine", 0.08);
    tone(660, 0.2, "sine", 0.08, 0.1);
  },
  legendary(): void {
    tone(392, 0.15, "triangle", 0.1);
    tone(494, 0.15, "triangle", 0.1, 0.12);
    tone(587, 0.3, "triangle", 0.12, 0.24);
  },
  event(): void {
    tone(196, 0.4, "triangle", 0.12);
    tone(147, 0.5, "triangle", 0.1, 0.2);
  },
  victory(): void {
    tone(392, 0.18, "triangle", 0.12);
    tone(523, 0.18, "triangle", 0.12, 0.15);
    tone(659, 0.18, "triangle", 0.12, 0.3);
    tone(784, 0.5, "triangle", 0.14, 0.45);
  },
  death(): void {
    tone(200, 0.3, "sawtooth", 0.1);
    tone(120, 0.4, "sawtooth", 0.1, 0.15);
    tone(60, 0.6, "sawtooth", 0.1, 0.3);
  },
  pick(): void {
    tone(440, 0.1, "sine", 0.08);
    tone(587, 0.12, "sine", 0.08, 0.06);
  }
};
