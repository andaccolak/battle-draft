import Foundation

struct AvatarStyle: Identifiable, Hashable {
    let id: String
    let emoji: String
    let skin: String
    let outfit: String
    let trim: String
}

enum Avatars {
    static let all: [AvatarStyle] = [
        AvatarStyle(id: "blaze", emoji: "🔥", skin: "#e8b48c", outfit: "#b91c1c", trim: "#fbbf24"),
        AvatarStyle(id: "shadow", emoji: "🥷", skin: "#d9a06b", outfit: "#334155", trim: "#818cf8"),
        AvatarStyle(id: "viking", emoji: "🪓", skin: "#f0c8a0", outfit: "#7c2d12", trim: "#fbbf24"),
        AvatarStyle(id: "ronin", emoji: "🥋", skin: "#ecc094", outfit: "#4c1d95", trim: "#f472b6"),
        AvatarStyle(id: "corsair", emoji: "🏴‍☠️", skin: "#d9a06b", outfit: "#1f2937", trim: "#f59e0b"),
        AvatarStyle(id: "mystic", emoji: "🔮", skin: "#f1d3c2", outfit: "#581c87", trim: "#e879f9"),
        AvatarStyle(id: "golem", emoji: "🗿", skin: "#9ca3af", outfit: "#4b5563", trim: "#10b981"),
        AvatarStyle(id: "punk", emoji: "🎸", skin: "#e8b48c", outfit: "#171717", trim: "#22d3ee"),
        AvatarStyle(id: "valkyrie", emoji: "🦅", skin: "#f5d0b0", outfit: "#0e7490", trim: "#fde047"),
        AvatarStyle(id: "monk", emoji: "🧘", skin: "#d9a06b", outfit: "#ea580c", trim: "#fef3c7"),
        AvatarStyle(id: "frost", emoji: "❄️", skin: "#bfdbfe", outfit: "#1e40af", trim: "#93c5fd"),
        AvatarStyle(id: "minotaur", emoji: "🐂", skin: "#c2846a", outfit: "#78350f", trim: "#f59e0b")
    ]

    static func byId(_ id: String?) -> AvatarStyle {
        all.first { $0.id == id } ?? all[0]
    }
}
