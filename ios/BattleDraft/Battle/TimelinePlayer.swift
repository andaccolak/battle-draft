import Foundation
import Combine

@MainActor
final class TimelinePlayer: ObservableObject {
    @Published private(set) var index = 0
    private var task: Task<Void, Never>?

    func start(timeline: [TimelineEntry], elapsedMs: Double) {
        task?.cancel()
        guard !timeline.isEmpty else { return }
        var acc = 0.0
        var startIndex = timeline.count - 1
        var remaining = 0.0
        for (i, entry) in timeline.enumerated() {
            if elapsedMs < acc + entry.duration {
                startIndex = i
                remaining = acc + entry.duration - elapsedMs
                break
            }
            acc += entry.duration
        }
        index = startIndex
        let entries = timeline
        task = Task { [weak self] in
            var i = startIndex
            var wait = remaining
            while i < entries.count - 1 {
                try? await Task.sleep(nanoseconds: UInt64(max(0, wait) * 1_000_000))
                if Task.isCancelled { return }
                i += 1
                self?.index = i
                wait = entries[i].duration
            }
        }
    }

    func stopPlayback() {
        task?.cancel()
        task = nil
    }
}
