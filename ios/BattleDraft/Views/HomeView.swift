import SwiftUI

struct ActiveRoom: Identifiable, Hashable {
    let code: String
    let nickname: String
    var id: String { code }
}

struct HomeView: View {
    @ObservedObject var loc = Localization.shared
    @State private var nickname = UserDefaults.standard.string(forKey: "bd_nickname") ?? ""
    @State private var joinCode = ""
    @State private var busy = false
    @State private var errorText: String?
    @State private var activeRoom: ActiveRoom?
    @State private var showServerSheet = false
    @State private var serverDraft = Config.serverDisplay

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground()
                ScrollView {
                    VStack(spacing: 22) {
                        VStack(spacing: 6) {
                            Text("⚔️ BATTLE DRAFT")
                                .font(.system(size: 36, weight: .black, design: .rounded))
                            Text(loc.t("tagline"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 30)

                        CardSurface {
                            VStack(spacing: 14) {
                                TextField(loc.t("nickPlaceholder"), text: $nickname)
                                    .textFieldStyle(.plain)
                                    .multilineTextAlignment(.center)
                                    .font(.headline)
                                    .padding(.vertical, 12)
                                    .background(Color.black.opacity(0.3))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                PrimaryButton(title: busy ? loc.t("creating") : loc.t("createRoom")) {
                                    createRoom()
                                }
                                .disabled(busy)
                            }
                            .padding(16)
                        }

                        Text(loc.t("orJoin"))
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        CardSurface {
                            HStack(spacing: 10) {
                                TextField(loc.t("roomCodePlaceholder"), text: $joinCode)
                                    .textFieldStyle(.plain)
                                    .multilineTextAlignment(.center)
                                    .font(.system(.headline, design: .monospaced))
                                    .textInputAutocapitalization(.characters)
                                    .autocorrectionDisabled()
                                    .padding(.vertical, 12)
                                    .background(Color.black.opacity(0.3))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                Button(loc.t("join")) {
                                    joinRoom()
                                }
                                .font(.headline.bold())
                                .padding(.horizontal, 18)
                                .padding(.vertical, 12)
                                .background(Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .padding(16)
                        }

                        if let errorText {
                            Text(errorText)
                                .font(.footnote.bold())
                                .foregroundStyle(.red)
                        }

                        Text(loc.t("footer"))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .multilineTextAlignment(.center)
                            .padding(.top, 10)
                    }
                    .padding(.horizontal, 22)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showServerSheet = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(loc.lang == "tr" ? "🇹🇷 TR" : "🇬🇧 EN") {
                        loc.toggle()
                    }
                    .font(.caption.bold())
                }
            }
            .navigationDestination(item: $activeRoom) { room in
                RoomView(code: room.code, nickname: room.nickname)
            }
            .sheet(isPresented: $showServerSheet) {
                NavigationStack {
                    Form {
                        Section(loc.t("serverAddress")) {
                            TextField(Config.defaultServer, text: $serverDraft)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .keyboardType(.URL)
                        }
                    }
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("OK") {
                                Config.setServer(serverDraft)
                                showServerSheet = false
                            }
                        }
                    }
                }
                .presentationDetents([.height(220)])
            }
        }
    }

    private func validNickname() -> String? {
        let nick = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        guard nick.count >= 2 else {
            errorText = loc.t("nickTooShort")
            return nil
        }
        UserDefaults.standard.set(nick, forKey: "bd_nickname")
        return nick
    }

    private func createRoom() {
        guard let nick = validNickname() else { return }
        errorText = nil
        busy = true
        Task {
            defer { busy = false }
            do {
                let code = try await API.createRoom(nickname: nick, playerId: GameSession.persistentPlayerId())
                activeRoom = ActiveRoom(code: code, nickname: nick)
            } catch let apiError as APIError {
                errorText = loc.t(apiError.code)
            } catch {
                errorText = loc.t("serverUnreachable")
            }
        }
    }

    private func joinRoom() {
        guard let nick = validNickname() else { return }
        let code = joinCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard code.count == 6 else {
            errorText = loc.t("codeLength")
            return
        }
        errorText = nil
        activeRoom = ActiveRoom(code: code, nickname: nick)
    }
}
