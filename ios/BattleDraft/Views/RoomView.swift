import SwiftUI

struct RoomView: View {
    @ObservedObject var loc = Localization.shared
    @StateObject private var session: GameSession
    @Environment(\.dismiss) private var dismiss

    init(code: String, nickname: String) {
        _session = StateObject(wrappedValue: GameSession(code: code, nickname: nickname))
    }

    var body: some View {
        ZStack {
            AppBackground()
            if let snapshot = session.snapshot {
                VStack(spacing: 0) {
                    header(snapshot)
                    if let error = session.errorCode, !session.fatal {
                        Text(loc.t(error))
                            .font(.footnote.bold())
                            .foregroundStyle(.red)
                            .padding(.vertical, 4)
                            .task {
                                try? await Task.sleep(nanoseconds: 2_500_000_000)
                                session.errorCode = nil
                            }
                    }
                    phaseContent(snapshot)
                }
            } else if session.fatal {
                VStack(spacing: 12) {
                    Text("😵").font(.system(size: 50))
                    Text(loc.t(session.errorCode ?? "err_not_found"))
                        .foregroundStyle(.red)
                        .bold()
                }
                .task {
                    try? await Task.sleep(nanoseconds: 2_000_000_000)
                    dismiss()
                }
            } else {
                ProgressView()
                    .controlSize(.large)
            }
        }
        .navigationBarBackButtonHidden(true)
        .onAppear { session.start() }
        .onDisappear { session.stop() }
    }

    private func header(_ snapshot: RoomSnapshot) -> some View {
        HStack {
            Button(loc.t("leave")) {
                session.leave()
                dismiss()
            }
            .font(.footnote.bold())
            .foregroundStyle(.secondary)
            Spacer()
            Text("\(loc.t("room")) \(snapshot.code)")
                .font(.caption.bold())
                .foregroundStyle(Color.indigo)
            Spacer()
            Button(loc.lang == "tr" ? "🇹🇷" : "🇬🇧") {
                loc.toggle()
            }
            Circle()
                .fill(session.connected ? Color.green : Color.red)
                .frame(width: 8, height: 8)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    @ViewBuilder
    private func phaseContent(_ snapshot: RoomSnapshot) -> some View {
        switch snapshot.phase {
        case .lobby:
            LobbyView(session: session, snapshot: snapshot)
        case .draft:
            DraftView(session: session, snapshot: snapshot)
        case .luck:
            LuckView(session: session, snapshot: snapshot)
        case .event:
            if let event = snapshot.event {
                EventRevealView(event: event)
            }
        case .battle:
            if let battle = snapshot.battle {
                BattleView(session: session, battle: battle, eventId: snapshot.event?.id)
                    .id(battle.identity)
            } else if let bracket = snapshot.bracket {
                BracketView(rounds: bracket, players: snapshot.players)
            }
        case .champion:
            ChampionView(session: session, snapshot: snapshot)
        }
    }
}
