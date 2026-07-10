import SwiftUI

struct EventRevealView: View {
    @ObservedObject var loc = Localization.shared
    let event: GameEvent
    @State private var appeared = false

    var body: some View {
        let text = loc.eventText(event)
        VStack(spacing: 18) {
            Spacer()
            Text(loc.t("globalEvent").uppercased())
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .kerning(3)
            Text(event.emoji)
                .font(.system(size: 90))
                .scaleEffect(appeared ? 1 : 0.2)
                .animation(.spring(duration: 0.6, bounce: 0.5), value: appeared)
            Text(text.name)
                .font(.system(.largeTitle, design: .rounded).bold())
                .foregroundStyle(.yellow)
            Text(text.description)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
            Spacer()
            Text(loc.t("tournamentBegins"))
                .font(.footnote.bold())
                .foregroundStyle(.secondary)
                .padding(.bottom, 30)
        }
        .onAppear { appeared = true }
    }
}
