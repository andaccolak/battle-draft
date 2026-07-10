import Foundation
import Combine

@MainActor
final class Localization: ObservableObject {
    static let shared = Localization()

    @Published private(set) var lang: String

    private init() {
        if let stored = UserDefaults.standard.string(forKey: "bd_lang") {
            lang = stored
        } else if Locale.preferredLanguages.first?.lowercased().hasPrefix("tr") == true {
            lang = "tr"
        } else {
            lang = "en"
        }
    }

    func toggle() {
        lang = lang == "tr" ? "en" : "tr"
        UserDefaults.standard.set(lang, forKey: "bd_lang")
    }

    func t(_ key: String, _ params: [String: String] = [:]) -> String {
        guard let entry = ContentStrings.ui[key] else { return key }
        var template = lang == "tr" ? entry.tr : entry.en
        for (k, v) in params {
            template = template.replacingOccurrences(of: "{\(k)}", with: v)
        }
        return template
    }

    func itemName(id rawId: String) -> String {
        if rawId == "fists" { return t("fists") }
        var id = rawId
        var forged = false
        if id.hasSuffix("_forged") {
            id = String(id.dropLast(7))
            forged = true
        } else if id.hasSuffix("_gambled") {
            id = String(id.dropLast(8))
        }
        let name: String
        if lang == "tr" {
            name = ContentStrings.itemNamesTR[id] ?? ContentStrings.itemNamesEN[id] ?? id
        } else {
            name = ContentStrings.itemNamesEN[id] ?? id
        }
        return forged ? "\(name) ✨" : name
    }

    func itemName(_ item: Item) -> String {
        if lang == "en" { return item.name }
        return itemName(id: item.id)
    }

    func eventText(id: String) -> (name: String, description: String) {
        if lang == "tr", let tr = ContentStrings.eventsTR[id] {
            return tr
        }
        return ContentStrings.eventsEN[id] ?? (id, "")
    }

    func eventText(_ event: GameEvent) -> (name: String, description: String) {
        if lang == "tr", let tr = ContentStrings.eventsTR[event.id] {
            return tr
        }
        return (event.name, event.description)
    }

    func cardText(_ card: LuckCard) -> (name: String, description: String) {
        if lang == "tr", let tr = ContentStrings.luckCardsTR[card.id] {
            return tr
        }
        return (card.name, card.description)
    }

    func passiveLabel(_ passive: Passive) -> String {
        guard let template = ContentStrings.passiveTemplates[passive.type] else { return passive.label }
        let raw = lang == "tr" ? template.tr : template.en
        let value = passive.value == passive.value.rounded() ? String(Int(passive.value)) : String(passive.value)
        return raw.replacingOccurrences(of: "{v}", with: value)
    }

    func slotLabel(_ slot: String) -> String {
        t("slot_\(slot)")
    }

    func logLine(_ entry: TimelineEntry) -> String {
        guard let key = entry.key, let params = entry.params else { return entry.text }
        if key == "eventLine" {
            let id = params["event"]?.stringValue ?? ""
            let emoji = params["emoji"]?.stringValue ?? ""
            let ev = eventText(id: id)
            return "\(emoji) \(ev.name): \(ev.description)"
        }
        guard let template = ContentStrings.logTemplates[key] else { return entry.text }
        var line = lang == "tr" ? template.tr : template.en
        for (k, v) in params {
            var value = v.stringValue
            if k == "weapon" || k == "item" {
                value = itemName(id: value)
            } else if k == "slot" {
                value = slotLabel(value)
            }
            line = line.replacingOccurrences(of: "{\(k)}", with: value)
        }
        if entry.extra == true {
            line = t("extraAttackPrefix") + line
        }
        if key == "strike" {
            var bits: [String] = []
            if entry.crit == true { bits.append(t("critBit")) }
            if entry.blocked == true { bits.append(t("blockBit")) }
            if let absorbed = entry.absorbed, absorbed > 0 {
                bits.append(t("shieldBit", ["n": String(Int(absorbed))]))
            }
            if !bits.isEmpty {
                line = "\(line) \(bits.joined(separator: " "))"
            }
        }
        return line
    }
}
