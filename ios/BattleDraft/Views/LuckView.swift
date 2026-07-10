import SwiftUI

struct LuckView: View {
    @ObservedObject var loc = Localization.shared
    @ObservedObject var session: GameSession
    let snapshot: RoomSnapshot

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                VStack(spacing: 6) {
                    Text(loc.t("luckTitle"))
                        .font(.system(.title2, design: .rounded).bold())
                    Text(loc.t("luckSub"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let deadline = session.adjustedDeadline {
                        TimerBar(deadline: deadline, total: 25)
                    }
                }

                if let offer = session.luckOffer {
                    if offer.picked {
                        CardSurface {
                            VStack(spacing: 6) {
                                Text(loc.t("fateSealed"))
                                    .font(.headline.bold())
                                    .foregroundStyle(.purple)
                                Text(loc.t("waitingGamble"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(20)
                        }
                    } else {
                        ForEach(offer.cards) { card in
                            let text = loc.cardText(card)
                            Button {
                                session.pickLuck(card.id)
                            } label: {
                                HStack(spacing: 14) {
                                    Text(card.emoji)
                                        .font(.system(size: 38))
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(text.name)
                                            .font(.headline.bold())
                                        Text(text.description)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .multilineTextAlignment(.leading)
                                    }
                                    Spacer()
                                }
                                .padding(16)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.purple.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.purple.opacity(0.5), lineWidth: 2))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(16)
        }
    }
}
