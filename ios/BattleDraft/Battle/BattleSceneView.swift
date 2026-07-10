import SwiftUI
import RealityKit
import UIKit

enum FighterPose {
    case idle
    case windup
    case attack
    case hit
    case dodge
    case dead
    case victory
}

func posesFor(_ entry: TimelineEntry?) -> (a: FighterPose, b: FighterPose) {
    guard let entry else { return (.idle, .idle) }
    switch entry.t {
    case "windup":
        return entry.actor == "a" ? (.windup, .idle) : (.idle, .windup)
    case "attack":
        return entry.actor == "a" ? (.attack, .hit) : (.hit, .attack)
    case "miss":
        return entry.actor == "a" ? (.attack, .idle) : (.idle, .attack)
    case "dodge":
        return entry.actor == "a" ? (.attack, .dodge) : (.dodge, .attack)
    case "quirk":
        if entry.actor == "none" || (entry.dmg ?? 0) == 0 { return (.idle, .idle) }
        return entry.actor == "a" ? (.attack, .hit) : (.hit, .attack)
    case "death":
        return entry.actor == "a" ? (.dead, .idle) : (.idle, .dead)
    case "victory":
        return entry.actor == "a" ? (.victory, .dead) : (.dead, .victory)
    default:
        return (.idle, .idle)
    }
}

@MainActor
final class FighterRig {
    let root = Entity()
    let base: Transform
    let dir: SIMD3<Float>
    private var poseTask: Task<Void, Never>?

    init(fighter: FighterSnapshot, position: SIMD3<Float>, facing dir: SIMD3<Float>) {
        self.dir = dir
        var transform = Transform()
        transform.translation = position
        self.base = transform
        root.transform = transform

        let avatar = Avatars.byId(fighter.avatar)
        if let custom = try? Entity.load(named: "character_\(avatar.id)") {
            let bounds = custom.visualBounds(relativeTo: nil)
            let height = bounds.extents.y
            if height > 0.01 {
                custom.scale = SIMD3(repeating: 1.7 / height)
            }
            if let animation = custom.availableAnimations.first {
                custom.playAnimation(animation.repeat())
            }
            root.addChild(custom)
        } else {
            buildPlaceholder(avatar: avatar, fighter: fighter)
        }
    }

    private func buildPlaceholder(avatar: AvatarStyle, fighter: FighterSnapshot) {
        let outfit = UIColor(hexString: avatar.outfit)
        let skin = UIColor(hexString: avatar.skin)
        let trim = UIColor(hexString: avatar.trim)

        let body = ModelEntity(
            mesh: .generateBox(size: SIMD3<Float>(0.5, 0.85, 0.3), cornerRadius: 0.12),
            materials: [SimpleMaterial(color: outfit, isMetallic: false)]
        )
        body.position = SIMD3<Float>(0, 0.75, 0)
        root.addChild(body)

        let belt = ModelEntity(
            mesh: .generateBox(size: SIMD3<Float>(0.52, 0.1, 0.32), cornerRadius: 0.04),
            materials: [SimpleMaterial(color: trim, isMetallic: true)]
        )
        belt.position = SIMD3<Float>(0, 0.48, 0)
        root.addChild(belt)

        let head = ModelEntity(
            mesh: .generateSphere(radius: 0.21),
            materials: [SimpleMaterial(color: skin, isMetallic: false)]
        )
        head.position = SIMD3<Float>(0, 1.42, 0)
        root.addChild(head)

        let legL = ModelEntity(
            mesh: .generateBox(size: SIMD3<Float>(0.16, 0.42, 0.18), cornerRadius: 0.06),
            materials: [SimpleMaterial(color: outfit.darker(), isMetallic: false)]
        )
        legL.position = SIMD3<Float>(-0.14, 0.21, 0)
        root.addChild(legL)

        let legR = ModelEntity(
            mesh: .generateBox(size: SIMD3<Float>(0.16, 0.42, 0.18), cornerRadius: 0.06),
            materials: [SimpleMaterial(color: outfit.darker(), isMetallic: false)]
        )
        legR.position = SIMD3<Float>(0.14, 0.21, 0)
        root.addChild(legR)

        let disabled = Set(fighter.disabledItems)
        let weapon = fighter.equipment["weapon"]
        let weaponActive = weapon != nil && !disabled.contains(weapon?.id ?? "")

        if weaponActive, let weapon {
            let weaponEntity = ModelEntity(
                mesh: .generateBox(size: SIMD3<Float>(0.08, 0.95, 0.08), cornerRadius: 0.03),
                materials: [SimpleMaterial(color: UIColor.rarityColor(weapon.rarity), isMetallic: true)]
            )
            weaponEntity.position = SIMD3<Float>(0.36, 1.0, 0.12) + dir * 0.1
            weaponEntity.orientation = simd_quatf(angle: -0.5, axis: SIMD3<Float>(0, 0, 1))
            root.addChild(weaponEntity)
        } else {
            let fistL = ModelEntity(
                mesh: .generateSphere(radius: 0.09),
                materials: [SimpleMaterial(color: skin, isMetallic: false)]
            )
            fistL.position = SIMD3<Float>(-0.2, 1.12, 0) + dir * 0.28
            root.addChild(fistL)
            let fistR = ModelEntity(
                mesh: .generateSphere(radius: 0.1),
                materials: [SimpleMaterial(color: skin, isMetallic: false)]
            )
            fistR.position = SIMD3<Float>(0.2, 1.2, 0) + dir * 0.32
            root.addChild(fistR)
        }

        if fighter.equipment["helmet"] != nil {
            let helmet = ModelEntity(
                mesh: .generateSphere(radius: 0.24),
                materials: [SimpleMaterial(color: trim, isMetallic: true)]
            )
            helmet.position = SIMD3<Float>(0, 1.52, 0)
            helmet.scale = SIMD3<Float>(1, 0.62, 1)
            root.addChild(helmet)
        }

        let hasLegendary = fighter.equipment.values.contains { $0.rarity == "legendary" && !disabled.contains($0.id) }
        if hasLegendary {
            let aura = ModelEntity(
                mesh: .generateSphere(radius: 0.62),
                materials: [SimpleMaterial(color: UIColor.orange.withAlphaComponent(0.16), isMetallic: false)]
            )
            aura.position = SIMD3<Float>(0, 0.9, 0)
            root.addChild(aura)
        }
    }

    func setPose(_ pose: FighterPose) {
        poseTask?.cancel()
        switch pose {
        case .idle:
            move(to: base, duration: 0.3)
        case .windup:
            var t = base
            t.translation -= dir * 0.35
            t.scale = SIMD3<Float>(repeating: 1.05)
            move(to: t, duration: 0.35)
        case .attack:
            var lunge = base
            lunge.translation += dir * 1.15
            move(to: lunge, duration: 0.22)
            poseTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 500_000_000)
                guard let self, !Task.isCancelled else { return }
                self.move(to: self.base, duration: 0.3)
            }
        case .hit:
            var knock = base
            knock.translation -= dir * 0.3
            knock.rotation = simd_quatf(angle: -0.18, axis: cross(dir, SIMD3<Float>(0, 1, 0)))
            move(to: knock, duration: 0.15)
            poseTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 350_000_000)
                guard let self, !Task.isCancelled else { return }
                self.move(to: self.base, duration: 0.25)
            }
        case .dodge:
            var side = base
            side.translation += cross(dir, SIMD3<Float>(0, 1, 0)) * 0.6
            move(to: side, duration: 0.2)
            poseTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 450_000_000)
                guard let self, !Task.isCancelled else { return }
                self.move(to: self.base, duration: 0.25)
            }
        case .dead:
            var fall = base
            fall.rotation = simd_quatf(angle: .pi / 2, axis: cross(SIMD3<Float>(0, 1, 0), dir))
            fall.translation.y = 0.25
            move(to: fall, duration: 0.65)
        case .victory:
            poseTask = Task { [weak self] in
                guard let self else { return }
                for _ in 0..<6 {
                    if Task.isCancelled { return }
                    var up = self.base
                    up.translation.y += 0.4
                    self.move(to: up, duration: 0.28)
                    try? await Task.sleep(nanoseconds: 300_000_000)
                    if Task.isCancelled { return }
                    self.move(to: self.base, duration: 0.24)
                    try? await Task.sleep(nanoseconds: 320_000_000)
                }
            }
        }
    }

    private func move(to transform: Transform, duration: TimeInterval) {
        root.move(to: transform, relativeTo: root.parent, duration: duration, timingFunction: .easeInOut)
    }
}

extension UIColor {
    convenience init(hexString: String) {
        var value: UInt64 = 0
        Scanner(string: String(hexString.dropFirst())).scanHexInt64(&value)
        self.init(
            red: CGFloat((value >> 16) & 0xFF) / 255,
            green: CGFloat((value >> 8) & 0xFF) / 255,
            blue: CGFloat(value & 0xFF) / 255,
            alpha: 1
        )
    }

    func darker() -> UIColor {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        return UIColor(red: r * 0.65, green: g * 0.65, blue: b * 0.65, alpha: a)
    }

    static func rarityColor(_ rarity: String) -> UIColor {
        switch rarity {
        case "uncommon": return UIColor.systemGreen
        case "rare": return UIColor.systemBlue
        case "epic": return UIColor.systemPurple
        case "legendary": return UIColor.systemOrange
        default: return UIColor.lightGray
        }
    }
}

@MainActor
final class BattleSceneCoordinator {
    private var rigA: FighterRig?
    private var rigB: FighterRig?
    private var appliedIndex = -1

    func build(in arView: ARView, battle: BattlePayload, theme: ArenaTheme) {
        arView.environment.background = .color(theme.background)
        let anchor = AnchorEntity(world: .zero)
        arView.scene.addAnchor(anchor)

        let floor = ModelEntity(
            mesh: .generateBox(size: SIMD3<Float>(7.5, 0.14, 7.5), cornerRadius: 0.07),
            materials: [SimpleMaterial(color: theme.floor, isMetallic: false)]
        )
        floor.position = SIMD3<Float>(0, -0.07, 0)
        anchor.addChild(floor)

        let ring = ModelEntity(
            mesh: .generateBox(size: SIMD3<Float>(8.2, 0.06, 8.2), cornerRadius: 0.07),
            materials: [SimpleMaterial(color: theme.accent.withAlphaComponent(0.35), isMetallic: true)]
        )
        ring.position = SIMD3<Float>(0, -0.15, 0)
        anchor.addChild(ring)

        let sun = DirectionalLight()
        sun.light.intensity = theme.lightIntensity
        sun.look(at: .zero, from: SIMD3<Float>(2.5, 4.5, 2.5), relativeTo: nil)
        anchor.addChild(sun)

        let fill = PointLight()
        fill.light.intensity = theme.lightIntensity * 8
        fill.light.attenuationRadius = 14
        fill.position = SIMD3<Float>(-2, 3.5, 3)
        anchor.addChild(fill)

        let posA = SIMD3<Float>(-1.25, 0, 0.55)
        let posB = SIMD3<Float>(1.25, 0, -0.55)
        let dirAB = normalize(posB - posA)

        let a = FighterRig(fighter: battle.a, position: posA, facing: dirAB)
        let b = FighterRig(fighter: battle.b, position: posB, facing: -dirAB)
        anchor.addChild(a.root)
        anchor.addChild(b.root)
        rigA = a
        rigB = b

        addParticles(theme: theme, anchor: anchor)

        let camera = PerspectiveCamera()
        camera.look(at: SIMD3<Float>(0, 0.8, 0), from: SIMD3<Float>(2.9, 2.5, 3.6), relativeTo: nil)
        anchor.addChild(camera)
    }

    private func addParticles(theme: ArenaTheme, anchor: AnchorEntity) {
        guard theme.particles != .none else { return }
        if #available(iOS 18.0, *) {
            var emitter: ParticleEmitterComponent
            switch theme.particles {
            case .rain: emitter = ParticleEmitterComponent.Presets.rain
            case .snow: emitter = ParticleEmitterComponent.Presets.snow
            case .magic: emitter = ParticleEmitterComponent.Presets.magic
            case .sparks: emitter = ParticleEmitterComponent.Presets.sparks
            case .none: return
            }
            emitter.isEmitting = true
            let entity = Entity()
            entity.components.set(emitter)
            entity.position = SIMD3<Float>(0, 4, 0)
            anchor.addChild(entity)
        }
    }

    func apply(entry: TimelineEntry?, index: Int) {
        guard index != appliedIndex else { return }
        appliedIndex = index
        let poses = posesFor(entry)
        rigA?.setPose(poses.a)
        rigB?.setPose(poses.b)
    }
}

struct BattleSceneView: UIViewRepresentable {
    let battle: BattlePayload
    let theme: ArenaTheme
    let entry: TimelineEntry?
    let index: Int

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        context.coordinator.build(in: arView, battle: battle, theme: theme)
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        context.coordinator.apply(entry: entry, index: index)
    }

    func makeCoordinator() -> BattleSceneCoordinator {
        BattleSceneCoordinator()
    }
}
