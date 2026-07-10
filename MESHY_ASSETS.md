# Meshy Asset Bible — Battle Draft 3D

Everything needed to produce the full 3D asset set with Meshy. Follow the export rules exactly — the game loads assets by naming convention with automatic fallbacks, so files drop in with zero code edits (except where marked CODE).

Universal character style suffix (append to every character prompt):
`stylized low-poly RPG game character, heroic proportions, vibrant hand-painted colors, clean silhouette, T-pose, symmetrical, game-ready, single mesh`

Universal item style suffix (append to every item prompt):
`stylized low-poly fantasy game prop, single object, centered at origin, hand-painted, clean silhouette, game-ready`

Budgets: characters ≤30k triangles / ≤16 MB GLB (aim ~10 MB with 1024px textures), items ≤5k triangles / ≤2 MB, arenas ≤60k triangles / ≤25 MB.

## 1. The 12 character models

Export: `public/models3d/<avatarId>.glb`, rigged, ALL animation clips baked into the one GLB.

| avatarId | Prompt core |
| --- | --- |
| blaze | male warrior with spiky flame-red hair, crimson leather armor with gold trim ✅ DONE |
| shadow | hooded ninja assassin, dark blue-grey cloak and mask, face hidden in shadow, twin dagger sheaths |
| viking | burly viking berserker, long blond braided hair and beard, brown fur and leather armor, bare arms |
| ronin | lean samurai ronin, black top-knot hair, purple lamellar armor with pink sash, calm posture |
| corsair | pirate captain, red bandana, long dark naval coat, scarred grin, gold earring |
| mystic | sorceress with long violet hair, deep purple robe with glowing arcane runes, pale skin |
| golem | living stone golem, cracked grey rock body with glowing green crystal veins, massive shoulders |
| punk | street brawler with tall green mohawk, black studded jacket, cyan accents, fingerless gloves |
| valkyrie | valkyrie shieldmaiden, white-silver hair, teal and gold winged armor, regal stance |
| monk | bald warrior monk, orange robes with one shoulder bare, wooden prayer beads, muscular |
| frost | ice warrior with pale blue skin, white frost-crystal hair, dark blue armor with ice shards |
| minotaur | minotaur brute with bull horns and snout, brown hide, heavy leather harness, hooves |

## 2. The 20 common animations (every character gets the same set)

Apply via Meshy auto-rig → animation library. Search terms below; the clip NAME in the export must contain the keyword in the third column — that is how the game finds it (CODE: extend `CLIP_KEYWORDS` in `src/components/Arena3D.tsx` to the full table when the first 20-clip character lands).

| # | Animation | Required name keyword | Game use |
| --- | --- | --- | --- |
| 1 | Combat idle stance | `stance` or `idle` | default loop |
| 2 | Idle taunt / flex | `taunt` | random idle variety, pre-battle showcase |
| 3 | Walk forward | `walk` | approach in intros |
| 4 | Run forward | `run` | lunge approach on attack |
| 5 | Light sword slash | `slash` | blade weapon attack |
| 6 | Heavy overhead strike | `overhead` or `heavy` | heavy weapon attack (hammer/axe/club) |
| 7 | Triple combo attack | `combo` | crit attack |
| 8 | Punch cross | `punch` | fists / improvised quirk attacks |
| 9 | Kick | `kick` | fists variety, boot-throw quirks |
| 10 | Bow aim and shoot | `shoot` or `bow` | ranged weapon attack |
| 11 | Power-up charge | `charge` or `power` | windup suspense beat |
| 12 | Light hit reaction | `hit` | taking normal damage |
| 13 | Heavy knockdown | `knockdown` or `knock` | taking crit damage |
| 14 | Sidestep dodge | `sidestep` or `dodge` | dodge result |
| 15 | Dodge roll | `roll` | QTE perfect dodge |
| 16 | Block with guard | `block` | blocked-hit result |
| 17 | Stunned / dizzy | `stun` or `dizzy` | stun entries |
| 18 | Death fall forward | `death` or `dead` | losing |
| 19 | Death fall backward | `death_back` or `dying` | crit finisher variety |
| 20 | Victory cheer | `victory` or `cheer` | winning |

Bonus if available: `getup` (rise from ground) — used for Phoenix/lastStand revive.

## 3. The 48 item models

Export: `public/models3d/item_<itemId>.glb`. Orientation rules: weapons — grip/handle at origin, blade/head pointing +Y, real length ~1.0–1.4 m; helmets — centered, opening facing down, ~0.35 m tall; armor — hollow torso shell with pauldrons, no body inside, ~0.75 m; boots — a pair side by side, ~0.35 m; accessories — ~0.2 m, add glow/emissive for epic+.

Rarity styling: common = worn/plain materials, uncommon = clean + one color accent, rare = blue-tinted details, epic = purple glow accents, legendary = strong emissive glow + particles sculpted in.

### Weapons (16)
| id | Prompt core |
| --- | --- |
| w_rusty_sword | rusty chipped iron shortsword, worn leather grip |
| w_wooden_club | crude heavy wooden club with cracks and rope-wrapped handle |
| w_battle_axe | broad single-headed battle axe, notched steel blade, oak haft |
| w_dagger | slim curved assassin dagger, black blade, silver hilt |
| w_rapier | elegant thin rapier with ornate swept silver guard |
| w_bow | tall wooden longbow with taut string and leather grip |
| w_war_hammer | massive two-handed war hammer, square steel head, iron bands |
| w_spiked_flail | spiked iron ball flail on chain with wooden handle |
| w_twin_blades | pair of crossed twin scimitars, mirrored steel blades |
| w_poison_fang | serpent-fang dagger dripping green venom, snake-scale hilt |
| w_crossbow | heavy steel crossbow with thick limbs and wooden stock |
| w_executioner | huge executioner axe, crescent blade, dark iron, blood groove, purple glow |
| w_vampire_scythe | curved vampire scythe, crimson blade, bone shaft, purple mist glow |
| w_storm_spear | lightning spear with crackling electric blue blade, epic glow |
| w_dragonfang | legendary greatsword shaped like a dragon fang, orange ember glow, scale guard |
| w_void_reaper | legendary void scythe-blade, black metal with purple void energy cracks |

### Helmets (12)
| id | Prompt core |
| --- | --- |
| h_old_helmet | dented old iron soldier helmet with rivets |
| h_leather_cap | simple brown leather cap with stitching |
| h_bucket | comically plain metal bucket worn as helmet |
| h_iron_helm | heavy iron great helm with narrow eye slit |
| h_wizard_hat | tall crooked wizard hat, deep blue with star patterns |
| h_spiked_helm | iron helmet covered in sharp defensive spikes |
| h_bascinet | knight bascinet with hinged pointed visor, rare blue sheen |
| h_crown_vitality | golden circlet crown with glowing green heart gem |
| h_owl_helm | owl-shaped helm with feather details and amber glass eyes, epic |
| h_golden_crown | ornate royal golden crown with jewels, epic purple glow |
| h_dragon_king | legendary dragon-head helmet, horns and fangs, ember-glowing eyes |
| h_phoenix_crest | legendary phoenix-crest helm with flaming feather plume, fire glow |

### Armor (10)
| id | Prompt core |
| --- | --- |
| a_leather | simple brown leather cuirass with straps, hollow shell |
| a_chainmail | steel chainmail shirt with iron shoulder rings, hollow shell |
| a_mage_robe | flowing blue mage robe torso with rune embroidery, hollow shell |
| a_plate | polished full steel plate cuirass with pauldrons, hollow shell |
| a_shadow_cloak | dark hooded cloak with tattered smoky edges, hollow shell |
| a_thorned_mail | armor wrapped in living thorny vines with spikes, hollow shell |
| a_berserker_harness | leather chest harness with fur trim and rage-red war paint, hollow shell |
| a_guardian_plate | epic fortress-like plate armor with tower-shield pauldrons, gold trim, hollow shell |
| a_titan | legendary colossal stone-plate armor with ancient runes, orange glow seams, hollow shell |
| a_dragonscale | legendary green dragon-scale armor with overlapping iridescent scales, hollow shell |

### Boots (5)
| id | Prompt core |
| --- | --- |
| b_swift | light blue leather boots with wind-swirl engravings, pair |
| b_winged | rare boots with small white feathered wings at the ankles, pair |
| b_warlord | epic armored greaves with gold trim and battle scars, pair |
| b_hermes | legendary golden winged sandals with glowing aura, pair |
| b_phantom | legendary ghostly translucent boots with wispy smoke trails, pair |

### Accessories (5)
| id | Prompt core |
| --- | --- |
| c_lucky_coin | large ancient gold coin with four-leaf clover engraving |
| c_vampire_necklace | necklace with blood-red gem fang pendant, rare glow |
| c_guardian_charm | epic floating crystal orb charm with protective blue shield glow |
| c_phoenix_feather | legendary single flaming phoenix feather, fire particle glow |
| c_chaos_orb | legendary swirling chaos orb, shifting purple-cyan vortex energy |

## 4. How characters wear the items (attachment design)

Meshy characters are single meshes, so items are separate GLBs attached to skeleton bones at runtime (CODE — not yet implemented, next big task):

1. **Weapon** → right hand bone. Find bone by name match (`hand_r`, `RightHand`, `mixamorig:RightHand` — Meshy rigs vary; log the skeleton once per character). Item's origin is the grip, so attachment is position-zero plus a per-weapon-kind rotation (blade up, bow vertical in front).
2. **Helmet** → head bone, small +Y offset, scaled to head width (measure head bone to top-of-skeleton distance).
3. **Armor** → chest/spine bone. The hollow-shell props overlay the torso; scale by shoulder-bone distance. Where a shell clips badly on a bulky character (golem, minotaur), fall back to pauldrons-only or a rarity-colored emissive trim on the body material.
4. **Boots** → visual at foot bones is fiddly; MVP is a ground-level colored motion ring under the fighter matching the boots' rarity, upgrade to real foot attachments later.
5. **Accessory** → not worn: it orbits the fighter slowly at chest height (looks magical, works on every body shape, zero fitting problems).

Data model: `src/lib/game/attachments.ts` — per-item `{ file, bone: "hand"|"head"|"chest", offset, rotation, scale }` and per-character bone-name overrides. Disabled items (curse/magnet) render at 20% opacity grayscale. Pirate/trade steals mid-tournament — attachments must rebuild per battle from `battle.a/b.equipment` (they already carry the post-card equipment).

## 5. Arena prompts (Meshy CAN do these — generate as a prop, not a scene)

Export: `public/models3d/arena_<fx>.glb`, a circular platform ~20 m diameter, FLAT and EMPTY in the middle 10 m (fighters stand there), decoration only on the outer ring. CODE: load in Arena3D per `EVENT_FX` group, replacing the plain cylinder; keep cylinder as fallback.

Base prompt:
`stylized low-poly circular fantasy battle arena platform, 20 meter diameter round stone colosseum ring, flat empty center floor, outer ring with broken pillars torches and banners, isometric game environment asset, hand-painted, single object, centered`

Theme variants (swap the middle description):
- `none` (default): ancient indigo stone, glowing blue rune circle in floor
- `rain/storm`: dark wet stone, puddles, moss, lightning rods on pillars
- `snow`: ice-covered stone, snow drifts, frozen banners
- `sun`: golden desert sandstone, sun emblems, heat-cracked floor
- `night/bloodmoon`: black gothic stone, red candles, gargoyle statues
- `poison`: swamp ruin, green ooze channels, giant mushrooms
- `quake`: shattered volcanic rock, lava cracks in outer ring
