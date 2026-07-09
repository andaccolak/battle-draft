"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Item, LuckCard, Passive, Slot, TimelineEntry } from "@/lib/game/types";
import { ITEMS } from "@/lib/game/items";
import { EVENTS } from "@/lib/game/events";
import { UI, type Lang } from "./dictionary";
import { EVENTS_TR, ITEM_NAMES_TR, LOG_TEMPLATES, LUCK_CARDS_TR, PASSIVE_TEMPLATES } from "./content";

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  itemName: (item: Item) => string;
  itemNameById: (id: string) => string;
  eventText: (id: string) => { name: string; description: string };
  cardText: (card: LuckCard) => { name: string; description: string };
  passiveLabel: (passive: Passive) => string;
  slotLabel: (slot: Slot) => string;
  logLine: (entry: TimelineEntry) => string;
}

const I18nContext = createContext<I18n | null>(null);

function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ""));
}

function baseItemId(id: string): { base: string; forged: boolean } {
  if (id.endsWith("_forged")) return { base: id.slice(0, -7), forged: true };
  if (id.endsWith("_gambled")) return { base: id.slice(0, -8), forged: false };
  return { base: id, forged: false };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const stored = localStorage.getItem("bd_lang");
    if (stored === "tr" || stored === "en") {
      setLangState(stored);
    } else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("tr")) {
      setLangState("en");
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("bd_lang", l);
  }, []);

  const value = useMemo<I18n>(() => {
    const t = (key: string, params?: Record<string, string | number>) => {
      const entry = UI[key];
      const template = entry ? entry[lang] : key;
      return params ? fill(template, params) : template;
    };

    const itemNameById = (id: string): string => {
      if (id === "fists") return t("fists");
      const { base, forged } = baseItemId(id);
      const original = ITEMS.find((i) => i.id === base);
      const name = lang === "tr" ? ITEM_NAMES_TR[base] ?? original?.name ?? base : original?.name ?? base;
      return forged ? `${name} ✨` : name;
    };

    const itemName = (item: Item): string => {
      if (lang === "en") return item.name;
      return itemNameById(item.id);
    };

    const eventText = (id: string) => {
      const tr = EVENTS_TR[id];
      if (lang === "tr" && tr) return tr;
      const def = EVENTS.find((e) => e.id === id);
      return { name: def?.name ?? id, description: def?.description ?? "" };
    };

    const cardText = (card: LuckCard) => {
      const tr = LUCK_CARDS_TR[card.id];
      if (lang === "tr" && tr) return tr;
      return { name: card.name, description: card.description };
    };

    const passiveLabel = (passive: Passive): string => {
      const template = PASSIVE_TEMPLATES[passive.type];
      if (!template) return passive.label;
      return fill(template[lang], { v: passive.value });
    };

    const slotLabel = (slot: Slot): string => t(`slot_${slot}`);

    const logLine = (entry: TimelineEntry): string => {
      if (!entry.key || !entry.params) return entry.text;
      if (entry.key === "eventLine") {
        const ev = eventText(String(entry.params.event));
        return `${entry.params.emoji} ${ev.name}: ${ev.description}`;
      }
      const template = LOG_TEMPLATES[entry.key];
      if (!template) return entry.text;
      const params: Record<string, string | number> = { ...entry.params };
      if (typeof params.weapon === "string") params.weapon = itemNameById(params.weapon);
      if (typeof params.item === "string") params.item = itemNameById(params.item);
      if (typeof params.slot === "string") params.slot = slotLabel(params.slot as Slot);
      let line = fill(template[lang], params);
      if (entry.extra) line = t("extraAttackPrefix") + line;
      if (entry.key === "strike") {
        const bits: string[] = [];
        if (entry.crit) bits.push(t("critBit"));
        if (entry.blocked) bits.push(t("blockBit"));
        if (entry.absorbed && entry.absorbed > 0) bits.push(t("shieldBit", { n: entry.absorbed }));
        if (bits.length > 0) line = `${line} ${bits.join(" ")}`;
      }
      return line;
    };

    return { lang, setLang, t, itemName, itemNameById, eventText, cardText, passiveLabel, slotLabel, logLine };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 transition active:scale-95"
    >
      {lang === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
    </button>
  );
}
