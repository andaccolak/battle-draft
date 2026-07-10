import Foundation

enum Config {
    static let defaultServer = "https://battle-draft.vercel.app"

    static var serverBaseURL: URL {
        let stored = UserDefaults.standard.string(forKey: "bd_server") ?? defaultServer
        return URL(string: stored) ?? URL(string: defaultServer)!
    }

    static func setServer(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            UserDefaults.standard.removeObject(forKey: "bd_server")
        } else {
            UserDefaults.standard.set(trimmed, forKey: "bd_server")
        }
    }

    static var serverDisplay: String {
        UserDefaults.standard.string(forKey: "bd_server") ?? defaultServer
    }
}
