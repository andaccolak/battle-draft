import Foundation

@MainActor
final class GameSession: ObservableObject {
    @Published private(set) var snapshot: RoomSnapshot?
    @Published private(set) var offer: DraftOffer?
    @Published private(set) var luckOffer: LuckOffer?
    @Published var errorCode: String?
    @Published private(set) var connected = false
    @Published private(set) var fatal = false

    let code: String
    let nickname: String
    let playerId: String
    private var pollTask: Task<Void, Never>?
    private var clockSkew: Double = 0

    init(code: String, nickname: String) {
        self.code = code
        self.nickname = nickname
        self.playerId = Self.persistentPlayerId()
    }

    static func persistentPlayerId() -> String {
        if let existing = UserDefaults.standard.string(forKey: "bd_playerId") {
            return existing
        }
        let fresh = UUID().uuidString.lowercased()
        UserDefaults.standard.set(fresh, forKey: "bd_playerId")
        return fresh
    }

    var adjustedDeadline: Date? {
        guard let deadline = snapshot?.deadline else { return nil }
        return Date(timeIntervalSince1970: (deadline + clockSkew) / 1000)
    }

    var isHost: Bool {
        snapshot?.hostId == playerId
    }

    var me: PublicPlayer? {
        snapshot?.players.first { $0.id == playerId }
    }

    func start() {
        guard pollTask == nil else { return }
        pollTask = Task {
            await send(["type": "join", "nickname": nickname])
            while !Task.isCancelled && !fatal {
                await poll()
                try? await Task.sleep(nanoseconds: 1_200_000_000)
            }
        }
    }

    func stop() {
        pollTask?.cancel()
        pollTask = nil
    }

    private func poll() async {
        do {
            let res = try await API.fetchRoom(code: code, playerId: playerId)
            apply(res)
            connected = true
        } catch {
            connected = false
        }
    }

    private func apply(_ res: RoomResponse) {
        if let snap = res.snapshot {
            clockSkew = Date().timeIntervalSince1970 * 1000 - snap.serverNow
            snapshot = snap
            offer = res.offer
            luckOffer = res.luckOffer
        }
        if let err = res.error {
            errorCode = err
            if err == "err_not_found" {
                fatal = true
            }
        }
    }

    private func send(_ body: [String: Any]) async {
        var payload = body
        payload["playerId"] = playerId
        do {
            let res = try await API.action(code: code, body: payload)
            apply(res)
            connected = true
        } catch {
            connected = false
            errorCode = "serverUnreachable"
        }
    }

    func startGame() {
        Task { await send(["type": "start"]) }
    }

    func chooseAvatar(_ id: String) {
        Task { await send(["type": "avatar", "avatarId": id]) }
    }

    func pickItem(_ itemId: String?) {
        Task { await send(["type": "pick", "itemId": itemId ?? NSNull()]) }
    }

    func pickLuck(_ cardId: String) {
        Task { await send(["type": "luck", "cardId": cardId]) }
    }

    func reactBattle(_ pass: Bool) {
        Task { await send(["type": "react", "pass": pass]) }
    }

    func playAgain() {
        Task { await send(["type": "again"]) }
    }

    func leave() {
        Task { await send(["type": "leave"]) }
        stop()
    }
}
