import Foundation

enum Phase: String {
    case lobby
    case draft
    case luck
    case event
    case battle
    case champion
}

extension Phase: Codable {
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = Phase(rawValue: raw) ?? .lobby
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

enum ParamValue: Codable, Hashable {
    case string(String)
    case number(Double)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) {
            self = .string(s)
        } else {
            self = .number(try container.decode(Double.self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .number(let n): try container.encode(n)
        }
    }

    var stringValue: String {
        switch self {
        case .string(let s): return s
        case .number(let n): return n == n.rounded() ? String(Int(n)) : String(n)
        }
    }
}

struct Passive: Codable, Hashable {
    let type: String
    let value: Double
    let label: String
}

struct ItemStats: Codable, Hashable {
    var attack: Double?
    var defense: Double?
    var hp: Double?
    var speed: Double?
    var critChance: Double?
    var critDamage: Double?
    var accuracy: Double?
    var dodge: Double?
    var initiative: Double?

    var display: [(key: String, value: Double)] {
        let all: [(String, Double?)] = [
            ("attack", attack), ("defense", defense), ("hp", hp), ("speed", speed),
            ("critChance", critChance), ("critDamage", critDamage),
            ("accuracy", accuracy), ("dodge", dodge), ("initiative", initiative)
        ]
        return all.compactMap { key, value in
            guard let value, value != 0 else { return nil }
            return (key, value)
        }
    }
}

struct Item: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let emoji: String
    let slot: String
    let rarity: String
    let stats: ItemStats
    let passive: Passive?
    let tags: [String]?
}

struct LuckCard: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let emoji: String
    let description: String
}

struct GameEvent: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let emoji: String
    let description: String
}

struct PublicPlayer: Codable, Hashable, Identifiable {
    let id: String
    let nickname: String
    let avatar: String?
    let isHost: Bool
    let isBot: Bool
    let connected: Bool
    let hasPicked: Bool
    let equipment: [String: Item]
    let luckCard: LuckCard?
    let eliminated: Bool
    let wins: Int
}

struct BracketMatch: Codable, Hashable {
    let a: String?
    let b: String?
    let winner: String?
}

struct BracketRound: Codable, Hashable {
    let matches: [BracketMatch]
}

struct TimelineEntry: Codable, Hashable {
    let t: String
    let actor: String
    let text: String
    let ms: Double?
    let key: String?
    let params: [String: ParamValue]?
    let dmg: Double?
    let heal: Double?
    let crit: Bool?
    let blocked: Bool?
    let absorbed: Double?
    let extra: Bool?
    let hpA: Double
    let hpB: Double
    let fx: String?

    var duration: Double { ms ?? 900 }
}

struct FighterSnapshot: Codable, Hashable {
    let nickname: String
    let avatar: String?
    let maxHp: Double
    let equipment: [String: Item]
    let luckCard: LuckCard?
    let disabledItems: [String]
}

struct PendingReaction: Codable, Hashable {
    let side: String
    let playerId: String
    let nickname: String
}

struct BattlePayload: Codable, Hashable {
    let roundIndex: Int
    let matchIndex: Int
    let roundKey: String
    let roundNumber: Int
    let elapsedMs: Double?
    let pending: PendingReaction?
    let a: FighterSnapshot
    let b: FighterSnapshot
    let winner: String
    let timeline: [TimelineEntry]

    var identity: String { "\(roundIndex)-\(matchIndex)" }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

struct RoomSnapshot: Codable {
    let code: String
    let phase: Phase
    let hostId: String
    let players: [PublicPlayer]
    let draftRound: Int
    let totalDraftRounds: Int
    let deadline: Double?
    let event: GameEvent?
    let bracket: [BracketRound]?
    let battle: BattlePayload?
    let champion: String?
    let serverNow: Double
}

struct DraftOffer: Codable {
    let round: Int
    let items: [Item]
    let lockedSlots: [String]
    let picked: Bool
    let canPickAny: Bool
}

struct LuckOffer: Codable {
    let cards: [LuckCard]
    let picked: Bool
}

struct RoomResponse: Codable {
    let snapshot: RoomSnapshot?
    let offer: DraftOffer?
    let luckOffer: LuckOffer?
    let error: String?
}

let allSlots = ["weapon", "helmet", "armor", "boots", "accessory"]
