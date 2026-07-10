import SwiftUI

struct LobbyView: View {
    @ObservedObject var loc = Localization.shared
    @ObservedObject var session: GameSession
    let snapshot: RoomSnapshot

    private let columns = [GridItem(.adaptive(minimum: 74), spacing: 10)]

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                CardSurface {
                    VStack(spacing: 4) {
                        Text(loc.t("roomCode").uppercased())
                            .font(.caption2.bold())
                            .foregroundStyle(.secondary)
                        Text(snapshot.code)
                            .font(.system(size: 42, weight: .black, design: .monospaced))
                            .foregroundStyle(Color.indigo)
                            .kerning(6)
                        Text(loc.t("joinHint"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(18)
                }

                CardSurface {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(loc.t("chooseFighter"))
                            .font(.headline.bold())
                        LazyVGrid(columns: columns, spacing: 10) {
                            ForEach(Avatars.all) { avatar in
                                let selected = session.me?.avatar == avatar.id
                                Button {
                                    session.chooseAvatar(avatar.id)
                                } label: {
                                    VStack(spacing: 4) {
                                        AvatarBadge(avatar: avatar, size: 52)
                                        Text(loc.t("avatar_\(avatar.id)"))
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundStyle(selected ? Color.indigo : .secondary)
                                    }
                                    .padding(8)
                                    .background(selected ? Color.indigo.opacity(0.25) : Color.white.opacity(0.04))
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(selected ? Color.indigo : Color.white.opacity(0.1), lineWidth: 2))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(16)
                }

                CardSurface {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(loc.t("warriors"))
                                .font(.headline.bold())
                            Spacer()
                            Text("\(snapshot.players.count)/8")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        ForEach(snapshot.players) { player in
                            HStack(spacing: 10) {
                                AvatarBadge(avatar: Avatars.byId(player.avatar), size: 36)
                                Text("\(player.isBot ? "🤖 " : player.isHost ? "👑 " : "")\(player.nickname)")
                                    .font(.subheadline.bold())
                                Spacer()
                                if player.id == session.playerId {
                                    Text(loc.t("you"))
                                        .font(.caption2.bold())
                                        .foregroundStyle(Color.indigo)
                                }
                                if !player.connected && !player.isBot {
                                    Text(loc.t("offline"))
                                        .font(.caption2)
                                        .foregroundStyle(.red)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding(16)
                }

                if session.isHost {
                    PrimaryButton(title: snapshot.players.count == 1 ? loc.t("startWithBots") : loc.t("startDraft")) {
                        session.startGame()
                    }
                } else {
                    Text(loc.t("waitingHost"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(16)
        }
    }
}
