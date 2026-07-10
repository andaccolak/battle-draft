import SwiftUI

@main
struct BattleDraftApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
                .preferredColorScheme(.dark)
        }
    }
}
