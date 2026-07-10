import UIKit

enum ArenaParticles {
    case rain
    case snow
    case magic
    case sparks
    case none
}

struct ArenaTheme {
    let background: UIColor
    let floor: UIColor
    let accent: UIColor
    let particles: ArenaParticles
    let lightIntensity: Float

    static let fallback = ArenaTheme(
        background: UIColor(red: 0.10, green: 0.09, blue: 0.28, alpha: 1),
        floor: UIColor(red: 0.19, green: 0.18, blue: 0.51, alpha: 1),
        accent: UIColor(red: 0.51, green: 0.55, blue: 0.97, alpha: 1),
        particles: .none,
        lightIntensity: 2200
    )

    static func forEvent(_ eventId: String?) -> ArenaTheme {
        switch eventId {
        case "rain", "thunderstorm":
            return ArenaTheme(
                background: UIColor(red: 0.05, green: 0.10, blue: 0.16, alpha: 1),
                floor: UIColor(red: 0.12, green: 0.23, blue: 0.37, alpha: 1),
                accent: UIColor(red: 0.58, green: 0.77, blue: 0.99, alpha: 1),
                particles: .rain,
                lightIntensity: 1500
            )
        case "blizzard":
            return ArenaTheme(
                background: UIColor(red: 0.20, green: 0.26, blue: 0.33, alpha: 1),
                floor: UIColor(red: 0.55, green: 0.61, blue: 0.69, alpha: 1),
                accent: UIColor.white,
                particles: .snow,
                lightIntensity: 2000
            )
        case "fog", "iron_sky":
            return ArenaTheme(
                background: UIColor(red: 0.17, green: 0.21, blue: 0.27, alpha: 1),
                floor: UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1),
                accent: UIColor(red: 0.82, green: 0.84, blue: 0.86, alpha: 1),
                particles: .none,
                lightIntensity: 1300
            )
        case "midnight_sun", "heatwave", "harvest":
            return ArenaTheme(
                background: UIColor(red: 0.49, green: 0.18, blue: 0.07, alpha: 1),
                floor: UIColor(red: 0.71, green: 0.33, blue: 0.04, alpha: 1),
                accent: UIColor(red: 0.98, green: 0.75, blue: 0.14, alpha: 1),
                particles: .none,
                lightIntensity: 3400
            )
        case "blood_moon", "vampire_night":
            return ArenaTheme(
                background: UIColor(red: 0.11, green: 0.04, blue: 0.04, alpha: 1),
                floor: UIColor(red: 0.29, green: 0.05, blue: 0.05, alpha: 1),
                accent: UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1),
                particles: .magic,
                lightIntensity: 1400
            )
        case "eclipse", "full_moon":
            return ArenaTheme(
                background: UIColor(red: 0.01, green: 0.02, blue: 0.09, alpha: 1),
                floor: UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1),
                accent: UIColor(red: 0.79, green: 0.84, blue: 0.94, alpha: 1),
                particles: .none,
                lightIntensity: 1200
            )
        case "poison_mist", "plague":
            return ArenaTheme(
                background: UIColor(red: 0.02, green: 0.18, blue: 0.09, alpha: 1),
                floor: UIColor(red: 0.08, green: 0.33, blue: 0.18, alpha: 1),
                accent: UIColor(red: 0.29, green: 0.87, blue: 0.50, alpha: 1),
                particles: .magic,
                lightIntensity: 1600
            )
        case "tornado", "storm_blades", "chaos_rift":
            return ArenaTheme(
                background: UIColor(red: 0.09, green: 0.31, blue: 0.39, alpha: 1),
                floor: UIColor(red: 0.08, green: 0.37, blue: 0.46, alpha: 1),
                accent: UIColor(red: 0.40, green: 0.91, blue: 0.98, alpha: 1),
                particles: .sparks,
                lightIntensity: 2200
            )
        case "earthquake", "gravity":
            return ArenaTheme(
                background: UIColor(red: 0.16, green: 0.15, blue: 0.14, alpha: 1),
                floor: UIColor(red: 0.27, green: 0.25, blue: 0.24, alpha: 1),
                accent: UIColor(red: 0.84, green: 0.83, blue: 0.82, alpha: 1),
                particles: .none,
                lightIntensity: 1800
            )
        default:
            return .fallback
        }
    }
}
