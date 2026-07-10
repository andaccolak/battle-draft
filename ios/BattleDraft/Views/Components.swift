import SwiftUI
import UIKit

extension Color {
    init(hex: String) {
        var value: UInt64 = 0
        Scanner(string: String(hex.dropFirst())).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

enum RarityStyle {
    static func color(_ rarity: String) -> Color {
        switch rarity {
        case "uncommon": return .green
        case "rare": return .blue
        case "epic": return .purple
        case "legendary": return .orange
        default: return .gray
        }
    }
}

struct CardSurface<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity)
            .background(Color.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.1)))
    }
}

struct AvatarBadge: View {
    let avatar: AvatarStyle
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            Circle()
                .fill(LinearGradient(colors: [Color(hex: avatar.outfit), Color(hex: avatar.trim)], startPoint: .top, endPoint: .bottom))
            Text(avatar.emoji)
                .font(.system(size: size * 0.5))
        }
        .frame(width: size, height: size)
        .overlay(Circle().stroke(Color(hex: avatar.trim).opacity(0.7), lineWidth: 2))
    }
}

struct PressableCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct ItemCardView: View {
    @ObservedObject var loc = Localization.shared
    let item: Item
    var locked = false
    var onPick: (() -> Void)?

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onPick?()
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Text(item.emoji)
                    .font(.system(size: 34))
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(loc.itemName(item))
                            .font(.system(.body, design: .rounded).bold())
                            .lineLimit(1)
                        Spacer()
                        Text(loc.t(item.rarity).uppercased())
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle(RarityStyle.color(item.rarity))
                    }
                    Text(loc.slotLabel(item.slot))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 10) {
                        ForEach(item.stats.display, id: \.key) { stat in
                            Text("\(stat.value > 0 ? "+" : "")\(Int(stat.value)) \(loc.t("stat_\(stat.key)"))")
                                .font(.caption.bold())
                                .foregroundStyle(stat.value > 0 ? Color.green : Color.red)
                        }
                    }
                    if let passive = item.passive {
                        Text("✦ \(loc.passiveLabel(passive))")
                            .font(.caption)
                            .foregroundStyle(.yellow)
                    }
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RarityStyle.color(item.rarity).opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(RarityStyle.color(item.rarity).opacity(0.6), lineWidth: 2))
            .overlay {
                if locked {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.black.opacity(0.55))
                    Text(loc.t("slotOccupied"))
                        .font(.caption.bold())
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(PressableCardStyle())
        .disabled(locked || onPick == nil)
        .saturation(locked ? 0 : 1)
    }
}

struct TimerBar: View {
    let deadline: Date
    let total: TimeInterval

    var body: some View {
        TimelineView(.animation(minimumInterval: 0.1)) { context in
            let remaining = max(0, deadline.timeIntervalSince(context.date))
            let fraction = total > 0 ? min(1, remaining / total) : 0
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.1))
                    Capsule()
                        .fill(fraction > 0.4 ? Color.green : fraction > 0.15 ? Color.yellow : Color.red)
                        .frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: 6)
        }
    }
}

struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(.headline, design: .rounded).bold())
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(LinearGradient(colors: [.indigo, .purple], startPoint: .leading, endPoint: .trailing))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

struct AppBackground: View {
    var body: some View {
        LinearGradient(colors: [Color(hex: "#1e1b4b"), Color(hex: "#0f172a")], startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
    }
}
