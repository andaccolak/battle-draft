import SwiftUI

struct BracketView: View {
    @ObservedObject var loc = Localization.shared
    let rounds: [BracketRound]
    let players: [PublicPlayer]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text(loc.t("tournament"))
                    .font(.system(.title2, design: .rounded).bold())
                ForEach(Array(rounds.enumerated()), id: \.offset) { index, round in
                    CardSurface {
                        VStack(spacing: 8) {
                            Text(index == rounds.count - 1 && round.matches.count == 1 ? loc.t("grandFinal") : loc.t("round", ["n": String(index + 1)]))
                                .font(.caption.bold())
                                .foregroundStyle(.yellow)
                            ForEach(Array(round.matches.enumerated()), id: \.offset) { _, match in
                                HStack {
                                    matchName(match.a, winner: match.winner)
                                    Text("VS")
                                        .font(.caption2.weight(.black))
                                        .foregroundStyle(.secondary)
                                    matchName(match.b, winner: match.winner)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(14)
                    }
                }
            }
            .padding(16)
        }
    }

    @ViewBuilder
    private func matchName(_ name: String?, winner: String?) -> some View {
        Text(name ?? loc.t("bye"))
            .font(.subheadline.bold())
            .foregroundStyle(winner == nil ? Color.primary : winner == name ? Color.green : Color.secondary)
            .strikethrough(winner != nil && winner != name && name != nil)
            .frame(maxWidth: .infinity)
    }
}
