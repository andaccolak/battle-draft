"use client";

import { motion } from "framer-motion";
import { BUILD_STAT_KEYS, type BuildStatKey, type BuildStats } from "@/lib/game/buildStats";
import type { CombatProfile } from "@/lib/game/combatProfile";
import type { Passive, PassiveType } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  stats: BuildStats;
  baseline: BuildStats;
  modifierLabel: string;
  highlighted?: BuildStatKey[];
  accent?: "emerald" | "fuchsia" | "amber";
  profile?: CombatProfile;
  baselineProfile?: CombatProfile;
}

const ACCENTS = {
  emerald: "border-emerald-400/30 bg-emerald-950/15",
  fuchsia: "border-fuchsia-400/30 bg-fuchsia-950/15",
  amber: "border-amber-400/30 bg-amber-950/15"
};

function signed(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

interface Effect {
  id: string;
  value: number | boolean | string;
  label: string;
}

function passive(type: PassiveType, value: number): Passive {
  return { type, value, label: "" };
}

export default function BuildStatsPanel({ stats, baseline, modifierLabel, highlighted = [], accent = "emerald", profile, baselineProfile }: Props) {
  const { t, passiveLabel } = useI18n();
  const effects = (source: CombatProfile | undefined): Effect[] => {
    if (!source) return [];
    const result: Effect[] = [];
    const addPassive = (type: PassiveType, value: number) => {
      if (value > 0) result.push({ id: type, value, label: passiveLabel(passive(type, Math.round(value))) });
    };
    addPassive("lifesteal", source.lifesteal);
    addPassive("reflect", source.reflect);
    addPassive("poisonOnHit", source.poisonOnHit);
    addPassive("extraAttack", source.extraAttack);
    addPassive("healPerTurn", source.healPerTurn);
    addPassive("sturdy", source.sturdy);
    addPassive("momentum", source.momentum);
    addPassive("executioner", source.executioner);
    addPassive("berserk", source.berserk);
    addPassive("ignoreDefense", source.ignoreDefense);
    addPassive("stunChance", source.stunChance);
    addPassive("critResist", source.critResist);
    addPassive("lastStand", source.lastStandValue);
    addPassive("block", source.block);
    addPassive("shield", source.shield);
    if (source.firstStrike) result.push({ id: "firstStrike", value: true, label: passiveLabel(passive("firstStrike", 1)) });
    if (source.firstCritReady) result.push({ id: "firstCrit", value: true, label: t("effectFirstCrit") });
    if (source.stunImmune) result.push({ id: "stunImmune", value: true, label: t("effectStunImmune") });
    if (source.poisonPerTurn > 0) result.push({ id: "poisonPerTurn", value: source.poisonPerTurn, label: t("effectPoisonPerTurn", { n: source.poisonPerTurn }) });
    if (source.healingDisabled) result.push({ id: "healingDisabled", value: true, label: t("effectHealingDisabled") });
    if (source.randomInitiative) result.push({ id: "randomInitiative", value: true, label: t("effectRandomInitiative") });
    if (source.accessoriesSilenced) result.push({ id: "accessoriesSilenced", value: true, label: t("effectAccessoriesSilenced") });
    if (source.uncertainEffects.length > 0) result.push({ id: "variable", value: source.uncertainEffects.join(","), label: t("effectVariable") });
    return result;
  };
  const currentEffects = effects(profile);
  const baselineEffects = new Map(effects(baselineProfile).map((effect) => [effect.id, effect.value]));
  return (
    <motion.section
      layout
      aria-label={t("overallStats")}
      aria-live="polite"
      className={`rounded-2xl border p-3 ${ACCENTS[accent]}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">📊 {t("overallStats")}</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
          {t("baseShort")} + {modifierLabel}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-1.5">
        {BUILD_STAT_KEYS.map((key) => {
          const delta = stats[key] - baseline[key];
          const changed = highlighted.includes(key);
          return (
            <motion.div
              key={key}
              animate={changed ? { scale: [1, 1.06, 1] } : undefined}
              className={`rounded-lg px-2 py-1.5 ${changed ? "bg-white/[0.09] ring-1 ring-white/10" : "bg-white/[0.04]"}`}
            >
              <dt className="truncate text-[8px] font-black uppercase tracking-wide text-slate-500">{t(`stat_${key}`)}</dt>
              <dd className="flex items-baseline justify-between gap-1">
                <span className="font-display text-sm font-black tabular-nums text-slate-100">{Math.round(stats[key])}</span>
                <span className={`text-[9px] font-black tabular-nums ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-700"}`}>
                  {signed(delta)}
                </span>
              </dd>
            </motion.div>
          );
        })}
      </dl>
      {currentEffects.length > 0 && (
        <div className="mt-2 border-t border-white/[0.06] pt-2 text-left">
          <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">{t("combatEffects")}</div>
          <div className="flex flex-wrap gap-1">
            {currentEffects.map((effect) => {
              const changed = baselineEffects.get(effect.id) !== effect.value;
              return (
                <span key={effect.id} className={`rounded-md border px-1.5 py-1 text-[9px] font-bold leading-tight ${changed ? "border-amber-300/25 bg-amber-400/10 text-amber-200" : "border-white/[0.06] bg-white/[0.035] text-slate-400"}`}>
                  {effect.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
}
