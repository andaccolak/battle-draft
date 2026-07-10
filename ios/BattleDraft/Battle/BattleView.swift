import SwiftUI
import UIKit

struct BattleView: View {
    @ObservedObject var loc = Localization.shared
    @ObservedObject var session: GameSession
    let battle: BattlePayload
    let eventId: String?
    @StateObject private var player = TimelinePlayer()
    @State private var knownTimelineCount = 0

    private var current: TimelineEntry? {
        battle.timeline[safe: min(player.index, battle.timeline.count - 1)]
    }

    private var atPause: Bool {
        battle.pending != nil && player.index >= battle.timeline.count - 1
    }

    private var qteMine: Bool {
        atPause && battle.pending?.playerId == session.playerId
    }

    var body: some View {
        VStack(spacing: 10) {
            Text(roundTitle)
                .font(.caption.weight(.black))
                .kerning(2)
                .foregroundStyle(.yellow)
                .padding(.horizontal, 14)
                .padding(.vertical, 5)
                .background(Capsule().fill(Color.white.opacity(0.1)))

            HStack(spacing: 12) {
                HPBarView(name: battle.a.nickname, hp: current?.hpA ?? battle.a.maxHp, maxHp: battle.a.maxHp, alignRight: false)
                HPBarView(name: battle.b.nickname, hp: current?.hpB ?? battle.b.maxHp, maxHp: battle.b.maxHp, alignRight: true)
            }

            ZStack {
                BattleSceneView(
                    battle: battle,
                    theme: ArenaTheme.forEvent(eventId),
                    entry: current,
                    index: player.index
                )
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white.opacity(0.1)))

                overlays
            }
            .frame(maxHeight: .infinity)

            logView
        }
        .padding(12)
        .onAppear {
            knownTimelineCount = battle.timeline.count
            player.start(timeline: battle.timeline, elapsedMs: battle.elapsedMs ?? 0)
        }
        .onDisappear { player.stopPlayback() }
        .onChange(of: battle.timeline.count) { _, newCount in
            if newCount != knownTimelineCount {
                knownTimelineCount = newCount
                player.start(timeline: battle.timeline, elapsedMs: battle.elapsedMs ?? 0)
            }
        }
        .onChange(of: player.index) { _, _ in
            hapticFor(current)
        }
    }

    private var roundTitle: String {
        switch battle.roundKey {
        case "final": return loc.t("grandFinal")
        case "semifinal": return loc.t("semifinal").uppercased()
        default: return loc.t("round", ["n": String(battle.roundNumber)]).uppercased()
        }
    }

    @ViewBuilder
    private var overlays: some View {
        if let entry = current {
            switch entry.t {
            case "intro":
                VSOverlay(battle: battle)
            case "showcase":
                ShowcaseOverlay(fighter: entry.actor == "a" ? battle.a : battle.b, headline: loc.logLine(entry))
            case "windup":
                bottomBanner(loc.logLine(entry), color: .yellow)
            case "attack":
                BigNumberOverlay(
                    text: "-\(Int(entry.dmg ?? 0))",
                    subtitle: entry.crit == true ? "💥 \(loc.t("bigCrit"))" : loc.t("bigDamage"),
                    color: entry.crit == true ? .orange : .red
                )
            case "miss":
                BigTextOverlay(text: "💨 \(loc.t("bigMiss"))", color: .gray)
            case "dodge":
                BigTextOverlay(
                    text: entry.key == "qteDodge" ? "🌀 \(loc.t("qtePerfect"))" : "🌀 \(loc.t("bigDodge"))",
                    color: .cyan
                )
            case "event", "card", "quirk":
                topBanner(loc.logLine(entry))
            case "victory":
                BigTextOverlay(text: loc.logLine(entry), color: .yellow)
            default:
                EmptyView()
            }
        }

        if atPause, let pending = battle.pending, !qteMine {
            bottomBanner(loc.t("qteWaiting", ["p": pending.nickname]), color: .cyan)
        }

        if qteMine {
            QteChallengeView { pass in
                session.reactBattle(pass)
            }
            .id(battle.timeline.count)
        }
    }

    private func bottomBanner(_ text: String, color: Color) -> some View {
        VStack {
            Spacer()
            Text(text)
                .font(.subheadline.bold())
                .italic()
                .foregroundStyle(color)
                .multilineTextAlignment(.center)
                .padding(12)
                .background(Color.black.opacity(0.75))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.bottom, 16)
                .padding(.horizontal, 12)
        }
    }

    private func topBanner(_ text: String) -> some View {
        VStack {
            Text(text)
                .font(.footnote.bold())
                .foregroundStyle(.yellow)
                .multilineTextAlignment(.center)
                .padding(10)
                .background(Color.black.opacity(0.85))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.top, 10)
                .padding(.horizontal, 12)
            Spacer()
        }
    }

    private var logView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(Array(battle.timeline.prefix(player.index + 1).enumerated()), id: \.offset) { offset, entry in
                        Text(loc.logLine(entry))
                            .font(.caption)
                            .foregroundStyle(logColor(entry))
                            .id(offset)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
            }
            .frame(height: 110)
            .background(Color.black.opacity(0.4))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .onChange(of: player.index) { _, newIndex in
                withAnimation { proxy.scrollTo(newIndex, anchor: .bottom) }
            }
        }
    }

    private func logColor(_ entry: TimelineEntry) -> Color {
        switch entry.t {
        case "victory": return .yellow
        case "death": return .red
        case "windup": return .secondary
        case "card", "event", "showcase", "quirk": return .yellow.opacity(0.8)
        default: return entry.crit == true ? .orange : .primary.opacity(0.85)
        }
    }

    private func hapticFor(_ entry: TimelineEntry?) {
        guard let entry else { return }
        switch entry.t {
        case "attack":
            UIImpactFeedbackGenerator(style: entry.crit == true ? .heavy : .medium).impactOccurred()
        case "death":
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "victory":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        default:
            break
        }
    }
}

struct HPBarView: View {
    let name: String
    let hp: Double
    let maxHp: Double
    let alignRight: Bool

    var body: some View {
        let fraction = maxHp > 0 ? max(0, min(1, hp / maxHp)) : 0
        VStack(alignment: alignRight ? .trailing : .leading, spacing: 3) {
            Text(name)
                .font(.caption.bold())
                .lineLimit(1)
            GeometryReader { geo in
                ZStack(alignment: alignRight ? .trailing : .leading) {
                    Capsule().fill(Color.white.opacity(0.1))
                    Capsule()
                        .fill(fraction > 0.5 ? Color.green : fraction > 0.25 ? Color.yellow : Color.red)
                        .frame(width: geo.size.width * fraction)
                        .animation(.easeOut(duration: 0.35), value: fraction)
                }
            }
            .frame(height: 10)
            Text("\(Int(max(0, hp))) / \(Int(maxHp))")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct VSOverlay: View {
    let battle: BattlePayload

    var body: some View {
        HStack(spacing: 18) {
            VStack(spacing: 6) {
                AvatarBadge(avatar: Avatars.byId(battle.a.avatar), size: 70)
                Text(battle.a.nickname)
                    .font(.headline.weight(.black))
                    .foregroundStyle(Color.indigo)
            }
            Text("VS")
                .font(.system(size: 44, weight: .black, design: .rounded))
                .foregroundStyle(.yellow)
            VStack(spacing: 6) {
                AvatarBadge(avatar: Avatars.byId(battle.b.avatar), size: 70)
                Text(battle.b.nickname)
                    .font(.headline.weight(.black))
                    .foregroundStyle(Color.pink)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.8))
        .transition(.opacity)
    }
}

struct ShowcaseOverlay: View {
    @ObservedObject var loc = Localization.shared
    let fighter: FighterSnapshot
    let headline: String

    var body: some View {
        VStack(spacing: 12) {
            Text(headline)
                .font(.headline.weight(.black))
                .foregroundStyle(.yellow)
                .multilineTextAlignment(.center)
            HStack(alignment: .top, spacing: 14) {
                AvatarBadge(avatar: Avatars.byId(fighter.avatar), size: 76)
                VStack(alignment: .leading, spacing: 5) {
                    let items = allSlots.compactMap { fighter.equipment[$0] }
                    if items.isEmpty {
                        gearChip(emoji: "🤜", name: loc.t("bareHands"), color: .gray)
                    }
                    ForEach(items) { item in
                        gearChip(emoji: item.emoji, name: loc.itemName(item), color: RarityStyle.color(item.rarity))
                    }
                }
            }
            .padding(.horizontal, 18)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.85))
        .transition(.opacity)
    }

    private func gearChip(emoji: String, name: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Text(emoji)
            Text(name)
                .font(.caption.bold())
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(color.opacity(0.6), lineWidth: 1.5))
    }
}

struct BigNumberOverlay: View {
    let text: String
    let subtitle: String
    let color: Color
    @State private var appeared = false

    var body: some View {
        VStack(spacing: 4) {
            Text(text)
                .font(.system(size: 70, weight: .black, design: .rounded))
                .foregroundStyle(color)
                .shadow(color: color.opacity(0.6), radius: 16)
            Text(subtitle)
                .font(.caption.weight(.black))
                .kerning(3)
                .foregroundStyle(.secondary)
        }
        .scaleEffect(appeared ? 1 : 2.4)
        .opacity(appeared ? 1 : 0)
        .animation(.spring(duration: 0.35, bounce: 0.4), value: appeared)
        .onAppear { appeared = true }
    }
}

struct BigTextOverlay: View {
    let text: String
    let color: Color
    @State private var appeared = false

    var body: some View {
        Text(text)
            .font(.system(size: 40, weight: .black, design: .rounded))
            .foregroundStyle(color)
            .shadow(color: .black.opacity(0.7), radius: 8)
            .multilineTextAlignment(.center)
            .scaleEffect(appeared ? 1 : 2)
            .opacity(appeared ? 1 : 0)
            .animation(.spring(duration: 0.35, bounce: 0.35), value: appeared)
            .onAppear { appeared = true }
    }
}

struct QteChallengeView: View {
    @ObservedObject var loc = Localization.shared
    let onResult: (Bool) -> Void
    @State private var result: Bool?
    @State private var startDate = Date()

    var body: some View {
        ZStack {
            Color.black.opacity(0.78)
            if let result {
                Text(result ? "✅ \(loc.t("qtePerfect"))" : "❌ \(loc.t("qteFailed"))")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(result ? Color.green : Color.red)
            } else {
                TimelineView(.animation) { context in
                    let pos = markerPosition(at: context.date)
                    VStack(spacing: 14) {
                        Text(loc.t("qteTitle"))
                            .font(.system(size: 40, weight: .black, design: .rounded))
                            .foregroundStyle(.cyan)
                            .shadow(color: .cyan.opacity(0.7), radius: 14)
                        Text(loc.t("qteHint"))
                            .font(.footnote.bold())
                            .foregroundStyle(.secondary)
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.12))
                                Capsule()
                                    .fill(Color.green.opacity(0.7))
                                    .frame(width: geo.size.width * 0.24)
                                    .offset(x: geo.size.width * 0.38)
                                Capsule()
                                    .fill(Color.white)
                                    .frame(width: 8)
                                    .offset(x: geo.size.width * pos - 4)
                                    .shadow(color: .white, radius: 6)
                            }
                        }
                        .frame(width: 270, height: 26)
                    }
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            guard result == nil else { return }
            let pos = markerPosition(at: Date())
            let pass = abs(pos - 0.5) <= 0.12
            result = pass
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            onResult(pass)
        }
        .onAppear { startDate = Date() }
    }

    private func markerPosition(at date: Date) -> Double {
        let t = date.timeIntervalSince(startDate)
        return (sin(t * 2 * .pi / 0.9) + 1) / 2
    }
}
