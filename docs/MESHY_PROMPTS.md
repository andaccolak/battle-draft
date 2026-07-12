# Meshy Text-to-3D Prompt Pack — Battle Draft

Copy-paste prompts for generating game-ready assets that match our KayKit look. Follow the global rules exactly or the asset will look wrong in game or won't attach to the rigs.

## Global rules (apply to EVERY generation)

**Style suffix — append to every prompt:**

> low poly game asset, flat colors with soft gradient shading, stylized chibi fantasy style matching KayKit adventurers, clean silhouette, single material, no realistic PBR textures, no rust noise, no text, no background

**Negative prompt (if Meshy asks):** realistic, photorealistic, high detail, noise, grunge, text, watermark, background, base plate

**Technical settings:**

| Asset type | Triangle budget | Texture | Export |
|---|---|---|---|
| Weapon / offhand | ≤ 1,500 tris | 512–1024 px | GLB |
| Headgear / mask | ≤ 1,200 tris | 512 px | GLB |
| Shield | ≤ 1,500 tris | 512 px | GLB |
| Prop (chest, banner...) | ≤ 2,000 tris | 512 px | GLB |
| Map / arena | ≤ 60,000 tris | 1024–2048 px | GLB, ≤ 8 MB |

**Orientation & scale:**
- Weapons: grip/handle at the origin, blade/head pointing **+Y (up)**, edge facing **+Z**. Real-world size (a sword ≈ 1.2 m tall in the file). We scale in code (`WEAPON_MODELS.scale`), so consistency matters more than exact size.
- Headgear: centered on origin, opening facing down, sized for a ~0.5 m diameter head (our characters are big-headed chibis).
- Shields: face toward **+Z**, grip at origin.
- Maps: ground plane at Y=0, arena center at origin. We auto-scale to 55 world units wide and find the floor by raycast — keep the FIGHTING FLOOR flat, circular-ish, and at least 40% of the total footprint, centered.

**Delivery:** drop weapon/gear GLBs in `public/models3d/kaykit/weapons/`, maps in `public/models3d/arena/` as `arena_<name>.glb`. Then Claude wires them (`WEAPON_MODELS` / `HEADGEAR_MODELS` / map list).

---

## 1. Weapons (fill the gaps — these currently borrow other models)

1. **War Hammer** — "medieval war hammer with oversized square iron head and short wooden handle, leather grip wrap"
2. **Spiked Flail** — "medieval flail, short wooden handle, chain with three links, spiked iron ball"
3. **Vampire Scythe** — "curved reaper scythe, dark wood shaft, crimson-tinted curved blade, small bat wing ornament at the joint"
4. **Storm Spear** — "fantasy spear with leaf-shaped silver blade, blue lightning ornament spiraling the shaft"
5. **Katana** — "curved katana with dark red lacquered scabbard-less blade, gold square guard, wrapped grip"
6. **Morningstar Mace** — "one-handed mace with round spiked golden head"
7. **Halberd** — "tall halberd, axe blade plus top spike, banner ribbon tied under the head"
8. **Trident** — "bronze trident with three prongs and sea-green gem in the base"
9. **Magic Orb Staff** — "wizard staff with floating purple crystal orb held by three claws"
10. **Throwing Dagger set** — "three small identical throwing daggers on a leather bandolier strip"

## 2. Headgear (attach to the head bone — keep them chunky)

1. **Bucket Helm** — "upside-down wooden bucket worn as a helmet, metal band, small dent"
2. **Spiked Helm** — "round iron helmet with five short spikes on top"
3. **Owl Helm** — "leather hood shaped like an owl head with two feather tufts and big round amber eyes"
4. **Crown of Vitality** — "royal crown with green heart-shaped gems, warm gold"
5. **Golden Crown** — "tall ornate golden crown with red gems and cross fleury tips"
6. **Phoenix Crest** — "winged helmet with orange flame-shaped crest sweeping backwards"
7. **Plague Mask** — "plague doctor bird mask with round brass goggles" *(fun accessory-slot mask)*
8. **Horned Helm** — "viking helmet with two curved bull horns and fur brim"

## 3. Shields & offhand

1. **Tower Shield** — "tall rectangular tower shield, dark iron with gold lion emblem"
2. **Kite Shield** — "kite shield, blue field with white diagonal stripe"
3. **Buckler** — "small round buckler with a big center spike"
4. **Lantern** — "hanging iron lantern with warm glowing candle" *(offhand prop)*
5. **Battle Banner** — "small war banner on a short pole, torn red flag with gold sun emblem" *(back attachment like the quiver)*

## 4. Armor / boots / accessories — read first

Our character bodies are single baked meshes, so chest armor and boots **cannot be worn** by the rigs (they would clip). Two usable options:
- **Accessory-scale trinkets that CAN attach**: necklace medallion (chest bone), floating orb (orbit), back banner, quiver, mask, shoulder pet.
- **Showcase props**: rendered next to the item card, not on the body (needs a small UI feature first — ask Claude).

Attachable trinket prompts:
1. **Berserker Totem** — "small wooden tiki totem charm with angry face, rope loop"
2. **Chaos Orb** — "swirling purple-black magic orb with floating rock shards"
3. **Phoenix Feather** — "single large glowing orange feather"
4. **Guardian Charm** — "round blue amulet with embossed shield symbol"
5. **Shoulder Raven** — "small black raven perched, folded wings" *(sits on the shoulder — fun legendary visual)*

## 5. Maps (arena GLBs)

Requirements recap: origin-centered, flat circular fighting floor ≥ 40% of footprint, ground at Y=0, ≤ 60k tris, ≤ 8 MB after texture compression. Interiors must be OPEN-TOPPED or have a high ceiling — our camera orbits at up to 19 units out and 6.5 up (relative to a 55-unit-wide scene).

1. **Tavern** — "medieval tavern interior arena, circular cleared wooden floor in the center for a duel, surrounding wooden tables with mugs and stools pushed back, low-poly patrons sitting and standing around the edge cheering with mugs raised, big stone fireplace, wooden ceiling beams high above with large opening in the middle, wide open shuttered windows on all walls showing a sunny village street outside, warm candle lighting, banners on the walls"
2. **Throne Room** — "castle throne room arena, circular red carpet fighting floor in the center, stone pillars along the sides, golden throne on a dais at one end, low-poly royal guards with halberds standing along the walls, tall open arched windows showing blue sky and mountains outside, hanging banners and chandeliers high above"
3. **Harbor Docks** — "wooden harbor dock arena at sunset, circular plank platform in the center, crates barrels and fishing nets around the edge, low-poly sailors watching from a moored ship on one side, open sea and lighthouse visible beyond the railing, seagulls, warm orange light"
4. **Forest Glade** — "enchanted forest glade arena, circular mossy stone floor in the center, giant twisted trees around the edge with glowing blue mushrooms, low-poly forest creatures watching from behind roots, sun rays through the canopy opening above, fireflies"
5. **Snowy Peak** — "mountain summit arena, circular frozen stone platform, snow drifts and ice crystals around the edge, low-poly pilgrim spectators in furs, prayer flags between wooden poles, open sky with peaks and clouds all around"

**After generating a map:** name it `arena_<name>.glb`, drop in `public/models3d/arena/`, then Claude runs the same optimization we used on the Colosseum (`gltf-transform dedup + resize 1024 + webp` — turned 24.7 MB into 1.7 MB) and adds it to the map selector. Never ship a map over ~8 MB — big textures crash iPhones.
