"use client";

import type { WeaponAudioKind } from "@/lib/game/items";

let ctx: AudioContext | null = null;
let output: GainNode | null = null;
let muted = false;

const SAMPLE_URLS = {
  bladeSwing: "/audio/combat/blade-swing.mp3",
  metalShield: "/audio/combat/metal-shield-impact.mp3",
  bodyPunch: "/audio/combat/body-punch.mp3",
  arrowSwish: "/audio/combat/arrow-swish.mp3",
  humanPain: "/audio/combat/human-pain.mp3",
  fireMagic: "/audio/combat/fire-magic.mp3"
} as const;

type SampleId = keyof typeof SAMPLE_URLS;

const sampleBytes = new Map<SampleId, Promise<ArrayBuffer | null>>();
const sampleBuffers = new Map<SampleId, AudioBuffer>();
const sampleLoads = new Map<SampleId, Promise<AudioBuffer | null>>();

if (typeof window !== "undefined") {
  muted = localStorage.getItem("bd_muted") === "1";
  for (const [id, url] of Object.entries(SAMPLE_URLS) as [SampleId, string][]) {
    sampleBytes.set(
      id,
      fetch(url)
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .catch(() => null)
    );
  }
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
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    master.gain.value = 0.72;
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    output = master;
    void warmSamples(ctx);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function loadSample(ac: AudioContext, id: SampleId): Promise<AudioBuffer | null> {
  const cached = sampleBuffers.get(id);
  if (cached) return Promise.resolve(cached);
  const pending = sampleLoads.get(id);
  if (pending) return pending;
  const bytes = sampleBytes.get(id) ?? fetch(SAMPLE_URLS[id]).then((response) => (response.ok ? response.arrayBuffer() : null)).catch(() => null);
  const load = bytes
    .then((value) => (value ? ac.decodeAudioData(value.slice(0)).catch(() => null) : null))
    .then((buffer) => {
      if (buffer) sampleBuffers.set(id, buffer);
      return buffer;
    });
  sampleLoads.set(id, load);
  return load;
}

async function warmSamples(ac: AudioContext): Promise<void> {
  await Promise.all((Object.keys(SAMPLE_URLS) as SampleId[]).map((id) => loadSample(ac, id)));
}

function sample(id: SampleId, volume: number, delay = 0, rate = 1): void {
  if (muted) return;
  const ac = audio();
  if (!ac || !output) return;
  const requestedAt = performance.now();
  const play = (buffer: AudioBuffer) => {
    if (muted || !output) return;
    const source = ac.createBufferSource();
    const gain = ac.createGain();
    const start = ac.currentTime + delay;
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(rate * (0.97 + Math.random() * 0.06), start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + Math.min(buffer.duration / rate, 1.7));
    source.connect(gain);
    gain.connect(output);
    source.start(start);
  };
  const cached = sampleBuffers.get(id);
  if (cached) {
    play(cached);
    return;
  }
  void loadSample(ac, id).then((buffer) => {
    if (buffer && performance.now() - requestedAt < 220) play(buffer);
  });
}

function sampleOr(id: SampleId, volume: number, delay: number, rate: number, fallback: () => void): void {
  if (muted) return;
  if (sampleBuffers.has(id)) {
    sample(id, volume, delay, rate);
    return;
  }
  const ac = audio();
  if (ac) void loadSample(ac, id);
  fallback();
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0, endFreq = freq): void {
  if (muted) return;
  const ac = audio();
  if (!ac || !output) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const start = ac.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(output);
  osc.start(start);
  osc.stop(start + duration);
}

function noise(duration: number, volume: number, cutoff: number, delay = 0, type: BiquadFilterType = "lowpass"): void {
  if (muted) return;
  const ac = audio();
  if (!ac || !output) return;
  const buffer = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * duration)), ac.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  const start = ac.currentTime + delay;
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.setValueAtTime(cutoff, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(start);
  source.stop(start + duration);
}

function bodyImpact(weight = 1, delay = 0): void {
  noise(0.09, 0.065 * weight, 1050, delay);
  tone(125, 0.14, "sine", 0.1 * weight, delay, 62);
}

function metalImpact(weight = 1, delay = 0): void {
  noise(0.055, 0.035 * weight, 7200, delay, "highpass");
  tone(640, 0.2, "triangle", 0.075 * weight, delay, 390);
  tone(1380, 0.16, "sine", 0.05 * weight, delay + 0.012, 860);
}

function airSwipe(weight = 1, delay = 0): void {
  noise(0.11 + weight * 0.025, 0.035 * weight, 2500 + weight * 700, delay, "bandpass");
  tone(470 - weight * 90, 0.1, "sine", 0.025 * weight, delay, 170);
}

function weaponWindup(kind: WeaponAudioKind): void {
  switch (kind) {
    case "sword":
      sampleOr("bladeSwing", 0.15, 0.08, 1.04, () => {
        metalImpact(0.48);
        airSwipe(0.45, 0.12);
      });
      break;
    case "dagger":
      sampleOr("bladeSwing", 0.11, 0.06, 1.22, () => {
        metalImpact(0.34);
        airSwipe(0.35, 0.08);
      });
      break;
    case "axe":
      sampleOr("bladeSwing", 0.12, 0.11, 0.78, () => {
        tone(118, 0.25, "triangle", 0.05, 0, 78);
        airSwipe(0.68, 0.16);
      });
      break;
    case "blunt":
      sampleOr("bladeSwing", 0.08, 0.12, 0.7, () => {
        tone(96, 0.24, "sine", 0.055, 0, 68);
        airSwipe(0.6, 0.15);
      });
      break;
    case "shield":
      metalImpact(0.55);
      break;
    case "scythe":
      sampleOr("bladeSwing", 0.14, 0.04, 0.88, () => {
        airSwipe(0.72);
        tone(820, 0.24, "triangle", 0.045, 0.05, 390);
      });
      break;
    case "bow":
      tone(165, 0.42, "triangle", 0.045, 0, 235);
      noise(0.18, 0.018, 3400, 0.05, "bandpass");
      break;
    case "crossbow":
      tone(92, 0.12, "square", 0.035);
      metalImpact(0.28, 0.12);
      break;
    case "magic":
      tone(220, 0.52, "sine", 0.05, 0, 660);
      tone(330, 0.48, "triangle", 0.035, 0.08, 990);
      break;
    case "fists":
      airSwipe(0.3, 0.1);
      break;
  }
}

function weaponImpact(kind: WeaponAudioKind, critical = false): void {
  const boost = critical ? 1.22 : 1;
  if (critical) sample("humanPain", 0.12 * boost, 0.03, 1.05);
  switch (kind) {
    case "sword":
      sampleOr("metalShield", 0.13 * boost, 0.015, 1.04, () => {
        airSwipe(0.65);
        metalImpact(0.72 * boost, 0.025);
      });
      bodyImpact(0.5 * boost, 0.035);
      break;
    case "dagger":
      sampleOr("bodyPunch", 0.1 * boost, 0.02, 1.2, () => {
        airSwipe(0.42);
        noise(0.065, 0.05 * boost, 1750, 0.018, "bandpass");
        bodyImpact(0.42 * boost, 0.028);
      });
      break;
    case "axe":
      sampleOr("bodyPunch", 0.14 * boost, 0.025, 0.8, () => {
        airSwipe(0.95);
        noise(0.09, 0.075 * boost, 1450, 0.03, "bandpass");
      });
      tone(105, 0.18, "triangle", 0.095 * boost, 0.035, 52);
      break;
    case "blunt":
      sampleOr("bodyPunch", 0.16 * boost, 0.02, 0.72, () => {
        airSwipe(0.75);
        bodyImpact(1.15 * boost, 0.035);
      });
      tone(72, 0.22, "sine", 0.11 * boost, 0.045, 38);
      break;
    case "shield":
      sampleOr("metalShield", 0.2 * boost, 0.01, 0.86, () => {
        airSwipe(0.65);
        metalImpact(0.85 * boost, 0.025);
      });
      bodyImpact(0.7 * boost, 0.04);
      break;
    case "scythe":
      sampleOr("bladeSwing", 0.13 * boost, 0.01, 0.9, () => {
        airSwipe(1.05);
        tone(920, 0.2, "triangle", 0.065 * boost, 0.02, 310);
      });
      bodyImpact(0.55 * boost, 0.055);
      break;
    case "bow":
      sampleOr("arrowSwish", 0.15, 0, 1.08, () => {
        tone(238, 0.11, "triangle", 0.075, 0, 112);
        noise(0.09, 0.045, 4300, 0.012, "highpass");
      });
      bodyImpact(0.55 * boost, 0.075);
      break;
    case "crossbow":
      sampleOr("arrowSwish", 0.18, 0, 0.9, () => {
        tone(145, 0.08, "square", 0.065, 0, 72);
        noise(0.055, 0.05, 5100, 0.008, "highpass");
      });
      bodyImpact(0.7 * boost, 0.065);
      break;
    case "magic":
      sampleOr("fireMagic", 0.16 * boost, 0, 1.02, () => {
        tone(760, 0.24, "sine", 0.075 * boost, 0, 190);
        tone(1140, 0.18, "triangle", 0.05 * boost, 0.015, 380);
        noise(0.2, 0.045 * boost, 2400, 0.025, "bandpass");
      });
      break;
    case "fists":
      sampleOr("bodyPunch", 0.2 * boost, 0, critical ? 0.88 : 1.02, () => {
        airSwipe(0.45);
        bodyImpact(0.95 * boost, 0.025);
      });
      break;
  }
}

function weaponMiss(kind: WeaponAudioKind, dodged = false): void {
  switch (kind) {
    case "bow":
      sampleOr("arrowSwish", 0.14, 0, 1.12, () => {
        tone(235, 0.12, "triangle", 0.065, 0, 105);
        noise(0.24, 0.038, 4200, 0.035, "bandpass");
      });
      break;
    case "crossbow":
      sampleOr("arrowSwish", 0.16, 0, 0.92, () => {
        tone(145, 0.08, "square", 0.06, 0, 70);
        noise(0.2, 0.038, 4900, 0.025, "bandpass");
      });
      break;
    case "magic":
      tone(650, 0.3, "sine", 0.06, 0, 145);
      noise(0.24, 0.028, 1900, 0.03, "bandpass");
      break;
    case "axe":
    case "blunt":
    case "shield":
      sampleOr("bladeSwing", 0.09, 0, 0.72, () => airSwipe(1));
      break;
    case "scythe":
      sampleOr("bladeSwing", 0.12, 0, 0.86, () => {
        airSwipe(1.08);
        tone(720, 0.16, "triangle", 0.04, 0.025, 260);
      });
      break;
    case "sword":
      sampleOr("bladeSwing", 0.13, 0, 1.02, () => {
        airSwipe(0.72);
        tone(630, 0.11, "triangle", 0.03, 0.02, 310);
      });
      break;
    case "dagger":
      sampleOr("bladeSwing", 0.1, 0, 1.2, () => airSwipe(0.45));
      break;
    case "fists":
      airSwipe(0.42);
      break;
  }
  if (dodged) {
    noise(0.14, 0.03, 1900, 0.07, "bandpass");
    tone(190, 0.1, "sine", 0.03, 0.08, 125);
  }
}

function defend(): void {
  sampleOr("metalShield", 0.24, 0, 0.96, () => metalImpact(1.15));
  tone(190, 0.16, "triangle", 0.065, 0.025, 105);
}

function barrier(): void {
  tone(880, 0.28, "sine", 0.08, 0, 310);
  tone(1320, 0.22, "triangle", 0.055, 0.025, 520);
  noise(0.22, 0.035, 2900, 0.02, "bandpass");
}

function critical(): void {
  tone(82, 0.3, "sawtooth", 0.12, 0, 42);
  noise(0.11, 0.065, 1500, 0.015);
}

function environment(kind = "event"): void {
  const id = kind.toLowerCase();
  const rain = new Set(["rain", "blizzard", "fog", "tornado", "pacifist_wind", "quirkrain"]);
  const storm = new Set(["thunderstorm", "iron_sky", "storm_blades"]);
  const ground = new Set(["earthquake", "gravity", "giants_might"]);
  const heat = new Set(["heatwave", "midnight_sun"]);
  const ominous = new Set(["blood_moon", "plague", "poison_mist", "eclipse", "cursed_ground", "vampire_night", "chaos_rift", "silence"]);
  const festive = new Set(["lucky_day", "harvest", "blessing", "merchants_gift", "golden_age"]);
  if (rain.has(id)) {
    noise(id === "rain" || id === "quirkrain" ? 0.8 : 0.55, 0.045, id === "blizzard" ? 3100 : 1700, 0, "bandpass");
    tone(150, 0.5, "sine", 0.035, 0.08, 92);
  } else if (storm.has(id)) {
    noise(0.75, 0.055, 1350);
    tone(78, 0.7, "sine", 0.11, 0.08, 38);
    tone(980, 0.08, "square", 0.045, 0.05, 240);
  } else if (ground.has(id)) {
    noise(0.75, 0.07, 560);
    tone(62, 0.8, "sawtooth", 0.12, 0, 34);
  } else if (heat.has(id)) {
    noise(0.5, 0.035, 2400, 0, "bandpass");
    tone(260, 0.55, "triangle", 0.055, 0, 410);
  } else if (ominous.has(id)) {
    noise(0.48, 0.03, 720);
    tone(92, 0.62, "triangle", 0.09, 0, 52);
    tone(138, 0.48, "sine", 0.055, 0.11, 74);
  } else if (festive.has(id)) {
    tone(392, 0.16, "triangle", 0.065);
    tone(523, 0.2, "triangle", 0.07, 0.12);
    tone(659, 0.28, "sine", 0.06, 0.25);
  } else {
    noise(0.35, 0.025, 960);
    tone(196, 0.48, "triangle", 0.065, 0, 132);
  }
}

function quirk(key = ""): void {
  switch (key) {
    case "quirkRain":
      environment(key);
      break;
    case "quirkBees":
      tone(185, 0.48, "sawtooth", 0.04, 0, 235);
      tone(226, 0.42, "sawtooth", 0.03, 0.04, 174);
      break;
    case "quirkChicken":
      tone(620, 0.08, "square", 0.045, 0, 410);
      tone(760, 0.07, "square", 0.04, 0.11, 520);
      break;
    case "quirkPigeon":
      tone(310, 0.18, "sine", 0.04, 0, 235);
      tone(365, 0.2, "sine", 0.035, 0.12, 260);
      break;
    case "quirkPhone":
      tone(660, 0.12, "sine", 0.065);
      tone(880, 0.12, "sine", 0.065, 0.14);
      tone(660, 0.12, "sine", 0.055, 0.28);
      break;
    case "quirkString":
      tone(265, 0.08, "square", 0.075, 0, 58);
      noise(0.1, 0.04, 4800, 0.015, "highpass");
      break;
    case "quirkRock":
    case "quirkBoot":
    case "quirkTomato":
      airSwipe(0.5);
      bodyImpact(key === "quirkRock" ? 0.8 : 0.55, 0.07);
      break;
    case "quirkBite":
    case "quirkHeadbutt":
    case "quirkSlipper":
    case "quirkBump":
    case "quirkDropFoot":
    case "quirkSneeze":
    case "quirkDead":
    case "quirkAllOutHit":
      bodyImpact(key === "quirkHeadbutt" || key === "quirkAllOutHit" ? 1.15 : 0.72);
      break;
    case "quirkCaught":
    case "quirkStuck":
    case "quirkArm":
    case "quirkHelmet":
      metalImpact(0.72);
      bodyImpact(0.4, 0.035);
      break;
    case "quirkCrack":
      metalImpact(0.9);
      noise(0.16, 0.055, 1750, 0.02, "bandpass");
      break;
    case "quirkShatter":
      metalImpact(1.2);
      noise(0.3, 0.075, 2400, 0.025, "bandpass");
      break;
    case "quirkSand":
      noise(0.3, 0.045, 3100, 0, "highpass");
      break;
    case "quirkTrip":
    case "quirkAnkle":
      noise(0.16, 0.04, 850);
      tone(108, 0.18, "sine", 0.06, 0.05, 58);
      break;
    case "quirkAllOutMiss":
      airSwipe(1.05);
      break;
    case "quirkPrayer":
    case "quirkSnack":
    case "quirkBreather":
      tone(480, 0.16, "sine", 0.055);
      tone(640, 0.22, "sine", 0.055, 0.1);
      break;
    case "quirkTaunt":
    case "quirkInsult":
    case "quirkReferee":
      tone(210, 0.12, "triangle", 0.045);
      tone(275, 0.15, "triangle", 0.04, 0.1);
      break;
    default:
      noise(0.12, 0.03, 1200);
      tone(170, 0.15, "sine", 0.035, 0, 110);
  }
}

export const sfx = {
  hit(): void {
    bodyImpact();
  },
  crit(): void {
    critical();
  },
  sword(heavy = false, criticalHit = false): void {
    weaponImpact(heavy ? "axe" : "sword", criticalHit);
  },
  defend,
  barrier,
  humanStrike(criticalHit = false): void {
    weaponImpact("fists", criticalHit);
  },
  miss(): void {
    weaponMiss("fists");
  },
  weaponWindup,
  weaponImpact,
  weaponMiss,
  quirk,
  heal(): void {
    tone(520, 0.15, "sine", 0.065);
    tone(660, 0.2, "sine", 0.065, 0.1);
  },
  poison(): void {
    noise(0.24, 0.035, 860);
    tone(185, 0.3, "sawtooth", 0.045, 0, 82);
  },
  stun(): void {
    tone(740, 0.1, "square", 0.055);
    tone(520, 0.12, "square", 0.05, 0.09);
    tone(860, 0.16, "square", 0.045, 0.19);
  },
  reflect(): void {
    metalImpact(0.65);
    tone(760, 0.22, "sine", 0.055, 0.04, 320);
  },
  legendary(): void {
    tone(392, 0.15, "triangle", 0.075);
    tone(494, 0.15, "triangle", 0.075, 0.12);
    tone(587, 0.3, "triangle", 0.09, 0.24);
  },
  environment,
  victory(): void {
    tone(392, 0.18, "triangle", 0.09);
    tone(523, 0.18, "triangle", 0.09, 0.15);
    tone(659, 0.18, "triangle", 0.09, 0.3);
    tone(784, 0.5, "triangle", 0.1, 0.45);
  },
  death(): void {
    sampleOr("humanPain", 0.32, 0, 0.82, () => tone(195, 0.38, "sawtooth", 0.065, 0, 92));
    noise(0.36, 0.065, 580, 0.68);
    tone(86, 0.42, "sine", 0.11, 0.68, 38);
    bodyImpact(1.2, 0.72);
  },
  pick(): void {
    tone(440, 0.1, "sine", 0.06);
    tone(587, 0.12, "sine", 0.06, 0.06);
  },
  reelSpin(durationMs = 4300): void {
    const tickCount = Math.max(3, Math.min(34, Math.round((durationMs / 4300) * 34)));
    const startProgress = 1 - tickCount / 34;
    const progresses = Array.from({ length: tickCount }, (_, index) => startProgress + (1 - startProgress) * (index / Math.max(1, tickCount - 1)));
    const intervals = progresses.slice(0, -1).map((progress) => 0.045 + progress * progress * 0.24);
    const naturalDuration = intervals.reduce((sum, interval) => sum + interval, 0);
    const scale = Math.max(0.1, durationMs / 1000) / Math.max(0.01, naturalDuration);
    let delay = 0;
    for (let index = 0; index < progresses.length; index++) {
      const progress = progresses[index] ?? 1;
      noise(0.022, 0.018 + progress * 0.012, 5200, delay, "highpass");
      tone(410 - progress * 170, 0.032, "square", 0.022 + progress * 0.012, delay, 315 - progress * 120);
      delay += (intervals[index] ?? 0) * scale;
    }
  },
  reelStop(): void {
    noise(0.055, 0.05, 4800, 0, "highpass");
    tone(185, 0.14, "square", 0.065, 0, 82);
    tone(620, 0.22, "triangle", 0.05, 0.035, 390);
  },
  windup(kind: WeaponAudioKind = "fists"): void {
    weaponWindup(kind);
  },
  finisher(): void {
    tone(72, 0.48, "sawtooth", 0.13, 0, 34);
    noise(0.18, 0.075, 1200, 0.02);
    tone(330, 0.55, "sine", 0.04, 0.16, 165);
  }
};
