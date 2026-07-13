"use client";

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  muted = localStorage.getItem("bd_muted") === "1";
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("bd_muted", value ? "1" : "0");
  } catch {}
}

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

function tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0, endFreq = freq): void {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), ac.currentTime + delay + duration);
  gain.gain.setValueAtTime(volume, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration);
}

function noise(duration: number, volume: number, cutoff: number, delay = 0): void {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const buffer = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * duration)), ac.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  const start = ac.currentTime + delay;
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  source.start(start);
  source.stop(start + duration);
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
  sword(heavy = false, critical = false): void {
    noise(0.055, heavy ? 0.065 : 0.045, 5200);
    tone(heavy ? 720 : 1450, heavy ? 0.19 : 0.13, "triangle", critical ? 0.14 : 0.095, 0, heavy ? 240 : 620);
    tone(heavy ? 1180 : 2300, 0.09, "sine", critical ? 0.1 : 0.065, 0.025, heavy ? 520 : 980);
    if (heavy) tone(92, 0.18, "sawtooth", critical ? 0.14 : 0.09, 0.035, 58);
  },
  defend(): void {
    noise(0.07, 0.045, 6800);
    tone(420, 0.2, "triangle", 0.12, 0, 360);
    tone(960, 0.28, "sine", 0.085, 0.018, 720);
    tone(1780, 0.18, "sine", 0.055, 0.035, 1300);
  },
  humanStrike(critical = false): void {
    noise(0.085, critical ? 0.1 : 0.07, 950);
    tone(115, 0.14, "sine", critical ? 0.16 : 0.11, 0, 62);
    tone(210, 0.07, "square", critical ? 0.085 : 0.055, 0.015, 120);
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
  environment(kind = "event"): void {
    const stormy = kind.includes("storm") || kind.includes("rain") || kind.includes("wind") || kind.includes("tornado");
    const ominous = kind.includes("poison") || kind.includes("plague") || kind.includes("blood") || kind.includes("eclipse");
    noise(stormy ? 0.85 : 0.45, stormy ? 0.055 : 0.028, stormy ? 1800 : 720);
    tone(ominous ? 92 : 196, 0.55, "triangle", 0.1, 0, ominous ? 58 : 147);
    tone(ominous ? 138 : 294, 0.38, "sine", 0.07, 0.14, ominous ? 82 : 220);
  },
  victory(): void {
    tone(392, 0.18, "triangle", 0.12);
    tone(523, 0.18, "triangle", 0.12, 0.15);
    tone(659, 0.18, "triangle", 0.12, 0.3);
    tone(784, 0.5, "triangle", 0.14, 0.45);
  },
  death(): void {
    noise(0.55, 0.055, 520, 0.05);
    tone(240, 0.35, "sawtooth", 0.11, 0, 112);
    tone(135, 0.48, "triangle", 0.12, 0.12, 62);
    tone(64, 0.75, "sine", 0.15, 0.25, 38);
  },
  pick(): void {
    tone(440, 0.1, "sine", 0.08);
    tone(587, 0.12, "sine", 0.08, 0.06);
  },
  windup(): void {
    tone(150, 0.12, "sine", 0.06);
    tone(190, 0.12, "sine", 0.06, 0.35);
    tone(240, 0.15, "sine", 0.07, 0.7);
    tone(300, 0.25, "sine", 0.05, 1.0);
  },
  finisher(): void {
    tone(700, 0.06, "square", 0.14);
    tone(110, 0.5, "sawtooth", 0.2);
    tone(55, 0.9, "sine", 0.22, 0.05);
    tone(330, 0.7, "sine", 0.05, 0.3);
  }
};
