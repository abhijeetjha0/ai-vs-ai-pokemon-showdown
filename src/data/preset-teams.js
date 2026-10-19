/**
 * Battle-tested Competitive Preset Teams for Pokémon Showdown
 * Standard Showdown Export format compatible with Teams.import()
 */

export const PRESET_TEAMS = [
  {
    id: 'kanto-classics',
    name: 'Kanto Legends',
    icon: 'bolt',
    description: 'Iconic Gen 1 powerhouse squad featuring Pikachu, Charizard, Blastoise, and Dragonite.',
    text: `Pikachu @ Light Ball
Ability: Static
Tera Type: Electric
- Thunderbolt
- Surf
- Volt Switch
- Grass Knot

Charizard @ Choice Specs
Ability: Blaze
Tera Type: Fire
- Flamethrower
- Air Slash
- Focus Blast
- Dragon Pulse

Blastoise @ Leftovers
Ability: Torrent
Tera Type: Water
- Scald
- Ice Beam
- Rapid Spin
- Protect

Venusaur @ Life Orb
Ability: Overgrow
Tera Type: Grass
- Giga Drain
- Sludge Bomb
- Earth Power
- Sleep Powder

Gengar @ Choice Scarf
Ability: Cursed Body
Tera Type: Ghost
- Shadow Ball
- Sludge Bomb
- Focus Blast
- Dazzling Gleam

Dragonite @ Lum Berry
Ability: Multiscale
Tera Type: Normal
- Dragon Dance
- Outrage
- Extreme Speed
- Earthquake`
  },
  {
    id: 'rain-offense',
    name: 'Rain Hyper Offense',
    icon: 'rainy',
    description: 'Drizzle tempo team: instant swift swim sweeps, hurricane accuracy, and thunder pressure.',
    text: `Pelipper @ Damp Rock
Ability: Drizzle
Tera Type: Ground
- Hurricane
- Hydro Pump
- U-turn
- Roost

Archaludon @ Assault Vest
Ability: Stamina
Tera Type: Fairy
- Electro Shot
- Draco Meteor
- Flash Cannon
- Body Press

Barraskewda @ Choice Band
Ability: Swift Swim
Tera Type: Water
- Liquidation
- Close Combat
- Flip Turn
- Aqua Jet

Raging Bolt @ Booster Energy
Ability: Protosynthesis
Tera Type: Electric
- Thunderclap
- Thunderbolt
- Dragon Pulse
- Calm Mind

Iron Treads @ Booster Energy
Ability: Quark Drive
Tera Type: Ghost
- Earthquake
- Rapid Spin
- Knock Off
- Ice Spinner

Zapdos @ Heavy-Duty Boots
Ability: Static
Tera Type: Steel
- Thunder
- Hurricane
- Volt Switch
- Roost`
  },
  {
    id: 'sun-offense',
    name: 'Sun Power Squad',
    icon: 'sunny',
    description: 'Drought-fueled Protosynthesis attackers with Chlorophyll Venusaur speed boost.',
    text: `Torkoal @ Heat Rock
Ability: Drought
Tera Type: Flying
- Lava Plume
- Rapid Spin
- Stealth Rock
- Will-O-Wisp

Walking Wake @ Choice Specs
Ability: Protosynthesis
Tera Type: Water
- Hydro Steam
- Draco Meteor
- Flamethrower
- Dragon Pulse

Roaring Moon @ Booster Energy
Ability: Protosynthesis
Tera Type: Flying
- Dragon Dance
- Acrobatics
- Knock Off
- Earthquake

Gouging Fire @ Booster Energy
Ability: Protosynthesis
Tera Type: Ground
- Dragon Dance
- Heat Crash
- Earthquake
- Morning Sun

Great Tusk @ Booster Energy
Ability: Protosynthesis
Tera Type: Ice
- Headlong Rush
- Close Combat
- Ice Spinner
- Rapid Spin

Venusaur @ Life Orb
Ability: Chlorophyll
Tera Type: Fire
- Growth
- Giga Drain
- Weather Ball
- Earth Power`
  },
  {
    id: 'paldea-titans',
    name: 'Paldea OU Titans',
    icon: 'military_tech',
    description: 'Top-tier Gen 9 OverUsed competitive core featuring Great Tusk, Kingambit, and Gholdengo.',
    text: `Great Tusk @ Leftovers
Ability: Protosynthesis
Tera Type: Water
- Earthquake
- Close Combat
- Knock Off
- Rapid Spin

Kingambit @ Leftovers
Ability: Supreme Overlord
Tera Type: Dark
- Swords Dance
- Kowtow Cleave
- Sucker Punch
- Iron Head

Gholdengo @ Choice Scarf
Ability: Good as Gold
Tera Type: Fighting
- Make It Rain
- Shadow Ball
- Focus Blast
- Trick

Dragapult @ Choice Specs
Ability: Infiltrator
Tera Type: Ghost
- Shadow Ball
- Draco Meteor
- Flamethrower
- U-turn

Ogerpon-Wellspring @ Wellspring Mask
Ability: Water Absorb
Tera Type: Water
- Ivy Cudgel
- Horn Leech
- Play Rough
- Swords Dance

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Fairy
- Moonblast
- Close Combat
- Shadow Ball
- Encore`
  },
  {
    id: 'trick-room',
    name: 'Trick Room Titans',
    icon: 'hourglass_top',
    description: 'Speed-inversion setup with Bloodmoon Ursaluna, Hatterene, and Armarouge.',
    text: `Hatterene @ Focus Sash
Ability: Magic Bounce
Tera Type: Steel
- Trick Room
- Dazzling Gleam
- Psychic
- Healing Wish

Ursaluna-Bloodmoon @ Life Orb
Ability: Mind's Eye
Tera Type: Normal
- Blood Moon
- Hyper Voice
- Earth Power
- Vacuum Wave

Torkoal @ Heat Rock
Ability: Drought
Tera Type: Flying
- Lava Plume
- Rapid Spin
- Stealth Rock
- Yawn

Cresselia @ Leftovers
Ability: Levitate
Tera Type: Poison
- Trick Room
- Lunar Blessing
- Ice Beam
- Moonblast

Kingambit @ Lum Berry
Ability: Supreme Overlord
Tera Type: Fire
- Kowtow Cleave
- Iron Head
- Sucker Punch
- Swords Dance

Armarouge @ Twisted Spoon
Ability: Flash Fire
Tera Type: Grass
- Expanding Force
- Armor Cannon
- Energy Ball
- Trick Room`
  }
];

export const POPULAR_ITEMS = [
  'Leftovers', 'Life Orb', 'Choice Band', 'Choice Specs', 'Choice Scarf',
  'Assault Vest', 'Focus Sash', 'Booster Energy', 'Heavy-Duty Boots',
  'Lum Berry', 'Rocky Helmet', 'Light Ball', 'Eviolite', 'Air Balloon',
  'Damp Rock', 'Heat Rock', 'Smooth Rock', 'Icy Rock'
];

export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Steel', 'Dark', 'Fairy'
];
