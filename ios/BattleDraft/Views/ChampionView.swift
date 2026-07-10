import SwiftUI

struct ChampionView: View {
    @ObservedObject var loc = Localization.shared
    @ObservedObject var session: GameSession
    let snapshot: RoomSnapshot

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                Spacer(minLength: 20)
                Text("🏆")
                    .font(.system(size: 90))
                Text(loc.t("champion").uppercased())
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                    .kerning(4)
                Text(snapshot.champion ?? "?")
                    .font(.system(size: 40, weight: .black, design: .rounded))
                    .foregroundStyle(.yellow)
                if let champion = snapshot.champion,
                   let me = session.me, me.nickname == champion {
                    Text(loc.t("thatsYou"))
                        .font(.headline.bold())
                        .foregroundStyle(.green)
                }

                CardSurface {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(loc.t("finalStandings"))
                            .font(.headline.bold())
                        ForEach(standings) { player in
                            HStack(spacing: 10) {
                                AvatarBadge(avatar: Avatars.byId(player.avatar), size: 32)
                                Text(player.nickname)
                                    .font(.subheadline.bold())
                                Spacer()
                                Text("\(player.wins) \(loc.t("wins"))")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(16)
                }

                if session.isHost {
                    PrimaryButton(title: loc.t("oneMoreGame")) {
                        session.playAgain()
                    }
                } else {
                    Text(loc.t("shoutHost"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(16)
        }
    }

    private var standings: [PublicPlayer] {
        snapshot.players.sorted { $0.wins > $1.wins }
    }
}
