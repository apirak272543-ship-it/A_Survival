export type MonsterRole = "regular" | "elite" | "event-boss";

export type MonsterModelBrief = {
  id: string;
  name: string;
  role: MonsterRole;
  silhouette: string;
  behavior: string;
  weakness: string;
  dropTheme: string;
  effectTone: string;
};

export type BiomeContent = {
  npc: string;
  landmark: string;
  resourceTheme: string;
  encounter: string;
  monsters: MonsterModelBrief[];
};

export type MapDefinition = {
  id: string;
  name: string;
  biome: string;
  subtitle: string;
  radiusMeters: number;
  threat: 1 | 2 | 3 | 4 | 5;
  accent: string;
  timeMode: "cycle" | "eternal-night" | "void";
  status: "prototype" | "planned";
  keyArt?: string;
  loadingCopy?: string;
  eventBossName?: string;
  content: BiomeContent;
};

const biomes: Omit<MapDefinition, "id" | "name" | "radiusMeters" | "threat" | "status">[] = [
  {
    biome: "Obsidian frontier", subtitle: "รอยแยกพลังงานต่างดาวและซากเมืองหินดำ", accent: "#00f3ff", timeMode: "cycle",
    content: { npc: "Relay Cartographer", landmark: "Crashed Leyline Monolith", resourceTheme: "Aether crystal and alloy", encounter: "Corruption surge around broken pylons", monsters: [
      { id: "corrupted-husk", name: "Corrupted Husk", role: "regular", silhouette: "slender ruined colonist with glowing cyan fractures", behavior: "chases in staggered packs", weakness: "arcane shield break", dropTheme: "corrupted alloy", effectTone: "cyan fracture sparks" },
      { id: "rift-hound", name: "Rift Hound", role: "regular", silhouette: "low four-legged void predator with a split luminous jaw", behavior: "flanks and lunges", weakness: "stun after lunge", dropTheme: "rift tendon", effectTone: "violet trail" },
      { id: "pylon-devourer", name: "Pylon Devourer", role: "elite", silhouette: "heavy quadruped wrapped in stolen metal rings", behavior: "guards resource pylons", weakness: "exposed core after charge", dropTheme: "charged pylon core", effectTone: "electric cyan arcs" },
      { id: "obsidian-warden", name: "Obsidian Warden", role: "event-boss", silhouette: "towering armoured sentinel with a floating rune halo", behavior: "summons husks and creates arena pulses", weakness: "break three halo nodes", dropTheme: "warden cache", effectTone: "black glass shards and violet shockwaves" },
    ] },
  },
  {
    biome: "Ashen hellscape", subtitle: "ทะเลเถ้าถ่านและประตูพลังงานนรก", accent: "#ff4d6d", timeMode: "eternal-night",
    content: { npc: "Ember Exile", landmark: "Furnace Cathedral", resourceTheme: "Ember ore and heat cores", encounter: "Cinder storm collapses safe paths", monsters: [
      { id: "cinder-wight", name: "Cinder Wight", role: "regular", silhouette: "thin ash-covered revenant with ember ribs", behavior: "throws short flame bursts", weakness: "cooling attacks", dropTheme: "ember ash", effectTone: "red-orange ash" },
      { id: "pyre-beetle", name: "Pyre Beetle", role: "regular", silhouette: "armoured beetle with a furnace shell", behavior: "rolls through formation", weakness: "rear vents", dropTheme: "heat shell", effectTone: "sparking furnace smoke" },
      { id: "furnace-seraph", name: "Furnace Seraph", role: "elite", silhouette: "winged furnace priest with molten fan-blades", behavior: "controls lanes with fire walls", weakness: "interrupt channeling", dropTheme: "seraph plate", effectTone: "flame feathers" },
      { id: "ash-tyrant", name: "Ash Tyrant", role: "event-boss", silhouette: "massive horned magma sovereign", behavior: "eruption rings and meteor volleys", weakness: "cracked crown during overload", dropTheme: "tyrant ember", effectTone: "lava burst" },
    ] },
  },
  {
    biome: "Mars expanse", subtitle: "หุบเขาดาวอังคารและฐานวิจัยที่ถูกทิ้งร้าง", accent: "#e76f51", timeMode: "cycle",
    content: { npc: "Dust Surveyor", landmark: "Ares Research Spire", resourceTheme: "Red iron and probe circuits", encounter: "Dust wall disables radar", monsters: [
      { id: "dust-scarab", name: "Dust Scarab", role: "regular", silhouette: "six-legged rust insect with a radar dish crest", behavior: "burrows before a cone attack", weakness: "visible antenna", dropTheme: "martian chitin", effectTone: "red dust" },
      { id: "probe-revenant", name: "Probe Revenant", role: "regular", silhouette: "broken exploration suit held by magnetic drones", behavior: "fires slow tracking bolts", weakness: "drone cluster", dropTheme: "probe lens", effectTone: "orange signal static" },
      { id: "crater-mimic", name: "Crater Mimic", role: "elite", silhouette: "wide mineral shell disguised as a rock shelf", behavior: "ambushes resource gatherers", weakness: "brightly exposed mouth", dropTheme: "mimic geode", effectTone: "rock blast" },
      { id: "red-oracle", name: "Red Oracle", role: "event-boss", silhouette: "levitating ancient terraformer with solar sails", behavior: "changes gravity lanes", weakness: "four exposed solar fins", dropTheme: "oracle satellite core", effectTone: "solar ribbons" },
    ] },
  },
  {
    biome: "Saharan glass", subtitle: "ทะเลทรายคริสตัลใต้พายุทรายเรืองแสง", accent: "#f4a261", timeMode: "cycle",
    content: { npc: "Glass Caravaner", landmark: "Singing Dune Observatory", resourceTheme: "Glass resin and water cells", encounter: "Mirage fields swap enemy silhouettes", monsters: [
      { id: "glass-jackal", name: "Glass Jackal", role: "regular", silhouette: "lean crystal canine with mirrored plates", behavior: "dashes between reflections", weakness: "shatter reflection anchor", dropTheme: "prismatic fang", effectTone: "amber refraction" },
      { id: "dune-crawler", name: "Dune Crawler", role: "regular", silhouette: "long segmented sand burrower", behavior: "surfaces in an arc", weakness: "soft neck joints", dropTheme: "dune membrane", effectTone: "sand spiral" },
      { id: "sun-scarab", name: "Sun Scarab", role: "elite", silhouette: "large beetle bearing a radiant disc", behavior: "reflects frontal attacks", weakness: "shadow-side core", dropTheme: "sun carapace", effectTone: "gold flare" },
      { id: "mirage-leviathan", name: "Mirage Leviathan", role: "event-boss", silhouette: "colossal translucent desert serpent", behavior: "splits into false trails", weakness: "true body casts a shadow", dropTheme: "leviathan glassheart", effectTone: "heat haze" },
    ] },
  },
  {
    biome: "Congo verdant", subtitle: "ป่าดงดิบ xenoflora และรากไม้ต่างดาว", accent: "#7ee787", timeMode: "cycle",
    content: { npc: "Spore Keeper", landmark: "Rootbound Relay Tree", resourceTheme: "Biomass and luminous spores", encounter: "Spore bloom mutates nearby creatures", monsters: [
      { id: "sporeling", name: "Sporeling", role: "regular", silhouette: "small mushroom creature with lantern gills", behavior: "bursts in clouds", weakness: "wind dispersal", dropTheme: "living spore", effectTone: "green motes" },
      { id: "vine-stalker", name: "Vine Stalker", role: "regular", silhouette: "panther-like predator woven from roots", behavior: "pulls player into brush", weakness: "cut root tether", dropTheme: "verdant fiber", effectTone: "leaf streak" },
      { id: "bloom-colossus", name: "Bloom Colossus", role: "elite", silhouette: "walking flower tower with insect wings", behavior: "creates hostile growth zones", weakness: "destroy pollen sacs", dropTheme: "bloom resin", effectTone: "bioluminescent petals" },
      { id: "the-root-mother", name: "The Root Mother", role: "event-boss", silhouette: "ancient tree intelligence with a mask-shaped crown", behavior: "commands vines and arena roots", weakness: "purify four root wells", dropTheme: "mother seed", effectTone: "emerald root wave" },
    ] },
  },
  {
    biome: "Stonecrest range", subtitle: "ภูเขาหินและอุโมงค์พลังงานโบราณ", accent: "#a8dadc", timeMode: "cycle",
    content: { npc: "Peak Mechanic", landmark: "Skyhook Ruin", resourceTheme: "Stone core and machine relics", encounter: "Avalanche routes redirect patrols", monsters: [
      { id: "cliff-maw", name: "Cliff Maw", role: "regular", silhouette: "stone-backed lizard with a vertical jaw", behavior: "charges from ledges", weakness: "slow after impact", dropTheme: "ridge scale", effectTone: "slate dust" },
      { id: "echo-wisp", name: "Echo Wisp", role: "regular", silhouette: "small wind spirit trapped in a crystal shell", behavior: "copies player movement", weakness: "disrupt crystal rhythm", dropTheme: "echo shard", effectTone: "pale wind rings" },
      { id: "cable-golem", name: "Cable Golem", role: "elite", silhouette: "mining machine rebuilt with stone fists", behavior: "throws terrain chunks", weakness: "sever power cable", dropTheme: "golem actuator", effectTone: "metal sparks" },
      { id: "summit-breaker", name: "Summit Breaker", role: "event-boss", silhouette: "armoured mountain beast with a prism horn", behavior: "breaks sections of the arena", weakness: "reflect horn beam to armour seams", dropTheme: "summit prism", effectTone: "ice-blue rockfall" },
    ] },
  },
  {
    biome: "Wildpine highlands", subtitle: "ป่าสนและศาลเจ้าเทคโนโลยีเวทโบราณ", accent: "#90be6d", timeMode: "cycle",
    content: { npc: "Shrine Ranger", landmark: "Aurora Shrine Array", resourceTheme: "Wildwood and rune bark", encounter: "Aurora rain changes elemental damage", monsters: [
      { id: "needle-wolf", name: "Needle Wolf", role: "regular", silhouette: "lupine creature with metallic pine quills", behavior: "fires quills in bursts", weakness: "stagger after shedding", dropTheme: "needle quill", effectTone: "green streak" },
      { id: "shrine-specter", name: "Shrine Specter", role: "regular", silhouette: "masked ghost held by holographic seals", behavior: "teleports between shrine marks", weakness: "disable marks", dropTheme: "sealed charm", effectTone: "aurora shimmer" },
      { id: "thunder-antler", name: "Thunder Antler", role: "elite", silhouette: "large stag with antenna antlers", behavior: "calls lightning tracks", weakness: "ground antlers with resin", dropTheme: "storm antler", effectTone: "cyan lightning" },
      { id: "aurora-guardian", name: "Aurora Guardian", role: "event-boss", silhouette: "sword-bearing forest giant under holographic leaves", behavior: "creates rotating aurora blades", weakness: "synchronize shrine switches", dropTheme: "guardian barkplate", effectTone: "northern ribbons" },
    ] },
  },
  {
    biome: "Astral drift", subtitle: "พื้นที่อวกาศแตกสลายและซากยานเอเลี่ยน", accent: "#9d7bff", timeMode: "void",
    content: { npc: "Void Salvager", landmark: "Fractured Arkship", resourceTheme: "Star alloy and void cells", encounter: "Gravity tide rotates platform routes", monsters: [
      { id: "void-mite", name: "Void Mite", role: "regular", silhouette: "tiny floating parasite with a single bright eye", behavior: "forms swarms around shields", weakness: "area pulse", dropTheme: "void residue", effectTone: "purple grains" },
      { id: "drift-drone", name: "Drift Drone", role: "regular", silhouette: "broken alien cube surrounded by rotating rings", behavior: "fires delayed orbit bolts", weakness: "interrupt ring alignment", dropTheme: "drone nucleus", effectTone: "violet orbit" },
      { id: "star-eater", name: "Star Eater", role: "elite", silhouette: "wide manta creature with a black-hole mouth", behavior: "pulls pickups and players", weakness: "destroy orbiting stars", dropTheme: "gravity gland", effectTone: "indigo lensing" },
      { id: "arkship-ghost", name: "Arkship Ghost", role: "event-boss", silhouette: "humanoid command AI projected in fractured armour", behavior: "rewrites arena gravity and summons drones", weakness: "restore three navigation beacons", dropTheme: "arkship command core", effectTone: "star fracture" },
    ] },
  },
];

const content = (npc: string, landmark: string, resources: string, encounter: string, regular: string, elite: string, boss: string): BiomeContent => ({
  npc,
  landmark,
  resourceTheme: resources,
  encounter,
  monsters: [
    { id: `${regular.toLowerCase().replaceAll(" ", "-")}-regular`, name: regular, role: "regular", silhouette: `Gemini-designed ${regular} silhouette`, behavior: "map-specific patrol and ambush behavior", weakness: "biome counterplay", dropTheme: resources, effectTone: "biome accent particles" },
    { id: `${elite.toLowerCase().replaceAll(" ", "-")}-elite`, name: elite, role: "elite", silhouette: `Gemini-designed ${elite} silhouette`, behavior: "high-pressure territorial encounter", weakness: "telegraphed core window", dropTheme: "refined component", effectTone: "elite energy burst" },
    { id: `${boss.toLowerCase().replaceAll(" ", "-")}-boss`, name: boss, role: "event-boss", silhouette: `Gemini-designed ${boss} silhouette`, behavior: "optional event boss with arena telegraphs", weakness: "event objective interaction", dropTheme: "event cache", effectTone: "boss anomaly pulse" },
  ],
});

const curatedFirstTen: MapDefinition[] = [
  { id: "obsidian-frontier", name: "Obsidian Frontier", biome: "Obsidian Alien Frontier", subtitle: "ฐานวิจัยพลังงานที่แตกสลายและรอยแยกต่างดาว", radiusMeters: 1000, threat: 1, accent: "#00f3ff", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map001-obsidian-outpost_09f41a7e.jpg", loadingCopy: "สัญญาณออบซิเดียนยังไม่เสถียร จงเตรียมอาวุธและเส้นทางกลับ Outpost", eventBossName: "Void Reaper", content: content("Commander Koral", "Crashed Leyline Monolith", "Ley Crystal and frontier alloy", "Distress pod trap", "Glass Stalker", "Obsidian Golem", "Void Reaper") },
  { id: "map-002-ashen-obsidian-plains", name: "Ashen Obsidian Plains", biome: "Obsidian Alien Frontier", subtitle: "ทุ่งหินดำและรอยแยกแมกม่าใต้พายุเถ้าถ่าน", radiusMeters: 1000, threat: 1, accent: "#ff4500", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_002-ashen-obsidian-plains_3ad69f5e.jpg", loadingCopy: "ระวังใต้เท้าของคุณ หินออบซิเดียนคมพอจะกรีดรองเท้าหนาของคุณได้", eventBossName: "Pyroclastic Behemoth", content: content("Scavenger Jax", "Magma Fissure Relay", "Obsidian Shards, Volcanic Ash, Sulfur Crystals", "Ash storm doubles rare drops", "Ash Crawler", "Obsidian Shell Golem", "Pyroclastic Behemoth") },
  { id: "map-003-bioluminescent-caverns", name: "Bioluminescent Caverns", biome: "Obsidian Alien Frontier", subtitle: "ถ้ำออบซิเดียนใต้ดินที่ส่องด้วยสปอร์ไซยาൻ", radiusMeters: 1200, threat: 1, accent: "#00ffff", timeMode: "void", status: "prototype", keyArt: "/manus-storage/map_003-bioluminescent-caverns_fcc8025b.jpg", loadingCopy: "อย่าออกนอกเส้นทางที่มีแสง ความมืดในถ้ำกำลังจ้องมองคุณอยู่", eventBossName: "Mycelium Empress", content: content("Researcher Lyra", "Surface Safety Rope", "Luminescent Moss, Glow Crystals, Spore Pouches", "Spore bloom heals player but enrages enemies", "Glow Spore Beetle", "Luminous Stalker", "Mycelium Empress") },
  { id: "map-004-crystalline-spires", name: "Crystalline Spires", biome: "Obsidian Alien Frontier", subtitle: "หุบเขาผลึกม่วงคมและทางแคบที่สะท้อนแสงต่างดาว", radiusMeters: 1100, threat: 2, accent: "#9932cc", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_004-crystalline-spires_337a1e45.jpg", loadingCopy: "สังเกตเงาของเสาหินเพื่อใช้เป็นที่กำบังจากแสงสะท้อน", eventBossName: "Resonance Archon", content: content("Cartographer Zephyr", "Resonance Pillars", "Resonating Quartz, Crystal Shards, Charged Dust", "Random reflection laser field", "Shard Gnat", "Prism Golem", "Resonance Archon") },
  { id: "map-005-corrosive-acid-swamps", name: "Corrosive Acid Swamps", biome: "Obsidian Alien Frontier", subtitle: "บึงน้ำกรดพิษและสะพานไม้ที่เป็นเส้นทางปลอดภัย", radiusMeters: 1300, threat: 2, accent: "#32cd32", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_005-corrosive-acid-swamps_06c2e49f.jpg", loadingCopy: "สวมรองเท้ากันกรดให้แน่น การก้าวพลาดเพียงครั้งเดียวอาจหมายถึงชีวิต", eventBossName: "Toxic Hydra", content: content("Alchemist Vane", "Acid Boardwalk Haven", "Acidic Sap, Corrosive Sludge, Toxic Lily", "Acid rain forces shelter play", "Acid Slime", "Mire Lurker", "Toxic Hydra") },
  { id: "map-006-magnetic-dunes", name: "Magnetic Dunes", biome: "Obsidian Alien Frontier", subtitle: "เนินทรายเหล็กดำ เศษซากลอยตัว และพายุแม่เหล็ก", radiusMeters: 1400, threat: 2, accent: "#ffd700", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_006-magnetic-dunes_53e50b18.jpg", loadingCopy: "เข็มทิศใช้ไม่ได้ในสนามแม่เหล็กนี้ จงเชื่อแผนที่ออฟไลน์ของคุณ", eventBossName: "Lodestone Colossus", content: content("Engineer Rusty", "Magnetic Stabilizer", "Magnetite Sand, Iron Ore, Floating Shards", "Magnetic storm disturbs metal loadouts", "Magnetic Hover-Ray", "Ironclad Golem", "Lodestone Colossus") },
  { id: "map-007-frozen-obsidian-crevasses", name: "Frozen Obsidian Crevasses", biome: "Obsidian Alien Frontier", subtitle: "รอยแยกน้ำแข็งและท่อไอน้ำที่เป็นแหล่งความร้อน", radiusMeters: 1250, threat: 2, accent: "#00bfff", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_007-frozen-obsidian-crevasses_16dab169.jpg", loadingCopy: "ความเย็นสามารถแช่แข็งเลือดของคุณได้เมื่ออยู่ห่างจากไอน้ำ", eventBossName: "Glacial Terror", content: content("Scout Frost", "Steam Vent Haven", "Glacial Ice, Frostweed, Cryo-Crystals", "Blizzard drives players to steam vents", "Frostbite Weaver", "Cryo-Beast", "Glacial Terror") },
  { id: "map-008-ancient-obsidian-ruins", name: "Ancient Obsidian Ruins", biome: "Obsidian Alien Frontier", subtitle: "วิหารเอเลี่ยนโบราณ ระบบป้องกันยังทำงานและรูนทองส่องแสง", radiusMeters: 1350, threat: 3, accent: "#daa520", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_008-ancient-obsidian-ruins_487bc022.jpg", loadingCopy: "ระบบป้องกันภัยโบราณยังสมบูรณ์ อย่าประมาทซากอารยธรรม", eventBossName: "Matrix Overlord", content: content("Historian Kael", "Rune Terminal", "Ancient Relic, Energy Core, Relic Metal", "Defense system sweeps the hall with lasers", "Sentinel Drone", "Ruin Guardian", "Matrix Overlord") },
  { id: "map-009-overgrown-obsidian-jungle", name: "Overgrown Obsidian Jungle", biome: "Obsidian Alien Frontier", subtitle: "ป่าเอเลี่ยนเรืองแสงที่รากดำและดอกไม้กินเนื้อครอบงำเส้นทาง", radiusMeters: 1500, threat: 3, accent: "#2e8b57", timeMode: "cycle", status: "prototype", keyArt: "/manus-storage/map_009-overgrown-obsidian-jungle_08f72bb5.jpg", loadingCopy: "พืชบางชนิดในป่านี้ไม่ได้ต้องการแค่แสงแดดและน้ำ", eventBossName: "Carnivorous Titan", content: content("Herbalist Flora", "Great Bloom Clearing", "Rare Herbs, Vine Fibers, Jungle Sap", "Pollen rain reverses movement briefly", "Thorn Spitter", "Jungle Stalker", "Carnivorous Titan") },
  { id: "map-010-void-infused-rift", name: "Void-Infused Rift", biome: "Obsidian Alien Frontier", subtitle: "เกาะหินลอยและรอยแยกมิติที่มี portal pad กลับค่ายเสมอ", radiusMeters: 1500, threat: 3, accent: "#8a2be2", timeMode: "void", status: "prototype", keyArt: "/manus-storage/map_010-void-infused-rift_d6554529.jpg", loadingCopy: "จงอยู่ใกล้ portal pad เมื่อแรงโน้มถ่วงของรอยแยกเริ่มแปรปรวน", eventBossName: "Void Singularity", content: content("Void Wanderer", "Stable Rift Pylons", "Void Essence, Dark Matter Dust, Rift Alloy", "Gravity tide rotates stable routes", "Void Larva", "Rift Horror", "Void Singularity") },
];

const regionWords = ["Reach", "Basin", "Hollow", "March", "Spine", "Veil", "Run", "Crown", "Fields", "Circuit", "Rift", "Expanse", "Gate"];

const plannedMaps: MapDefinition[] = Array.from({ length: 90 }, (_, offset) => {
  const index = offset + curatedFirstTen.length;
  const base = biomes[index % biomes.length]!;
  const sector = index + 1;
  const region = regionWords[Math.floor(index / biomes.length) % regionWords.length]!;
  const suffix = String(sector).padStart(3, "0");
  return {
    ...base,
    id: `${base.biome.toLowerCase().replaceAll(" ", "-")}-${suffix}`,
    name: `${base.biome} ${region} ${suffix}`,
    radiusMeters: 1000 + ((index * 71) % 501),
    threat: (Math.min(5, 1 + Math.floor(index / 20)) as 1 | 2 | 3 | 4 | 5),
    status: "planned",
  };
});

export const MAP_REGISTRY: MapDefinition[] = [...curatedFirstTen, ...plannedMaps];

export function getMapDefinition(mapId: string) {
  return MAP_REGISTRY.find(map => map.id === mapId);
}
