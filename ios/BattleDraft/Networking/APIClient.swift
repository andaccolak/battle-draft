import Foundation

struct APIError: Error {
    let code: String
}

enum API {
    static func createRoom(nickname: String, playerId: String) async throws -> String {
        struct CreateResponse: Codable {
            let code: String?
            let error: String?
        }
        let data = try await post(path: "api/rooms", body: ["nickname": nickname, "playerId": playerId])
        let res = try JSONDecoder().decode(CreateResponse.self, from: data)
        if let code = res.code { return code }
        throw APIError(code: res.error ?? "err_unknown")
    }

    static func fetchRoom(code: String, playerId: String) async throws -> RoomResponse {
        let url = Config.serverBaseURL.appendingPathComponent("api/rooms/\(code)")
        var comps = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "playerId", value: playerId)]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        return try JSONDecoder().decode(RoomResponse.self, from: data)
    }

    static func action(code: String, body: [String: Any]) async throws -> RoomResponse {
        let data = try await post(path: "api/rooms/\(code)", body: body)
        return try JSONDecoder().decode(RoomResponse.self, from: data)
    }

    private static func post(path: String, body: [String: Any]) async throws -> Data {
        var req = URLRequest(url: Config.serverBaseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }
}
