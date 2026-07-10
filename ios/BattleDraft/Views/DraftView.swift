import SwiftUI

struct DraftView: View {
    @ObservedObject var loc = Localization.shared
    @ObservedObject var session: GameSession
    let snapshot: RoomSnapshot

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                VStack(spacing: 6) {
                    Text("\(loc.t("draft")) \(snapshot.draftRound)/\(snapshot.totalDraftRounds)")
                        .font(.system(.title2, design: .rounded).bold())
                    Text(loc.t("pickOne"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let deadline = session.adjustedDeadline {
                        TimerBar(deadline: deadline, total: 35)
                    }
                }

                HStack(spacing: 6) {
                    ForEach(snapshot.players) { player in
                        AvatarBadge(avatar: Avatars.byId(player.avatar), size: 30)
                            .opacity(player.hasPicked ? 1 : 0.35)
                            .overlay(alignment: .bottomTrailing) {
                                if player.hasPicked {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 11))
                                        .foregroundStyle(.green)
                                }
                            }
                    }
                }

                if let offer = session.offer {
                    if offer.picked {
                        CardSurface {
                            VStack(spacing: 6) {
                                Text(loc.t("lockedIn"))
                                    .font(.headline.bold())
                                    .foregroundStyle(.green)
                                Text(loc.t("waitingSlow"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(20)
                        }
                    } else {
                        ForEach(offer.items) { item in
                            ItemCardView(
                                item: item,
                                locked: offer.lockedSlots.contains(item.slot),
                                onPick: { session.pickItem(item.id) }
                            )
                        }
                        if !offer.canPickAny {
                            PrimaryButton(title: loc.t("skipRound")) {
                                session.pickItem(nil)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
    }
}
