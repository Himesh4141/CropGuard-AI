/** Curated horticultural care library. NOT training labels or image-diagnosis output.
 * Care varies by cultivar, pot size, climate, and local conditions.
 */
export type FlowerCategory = "balcony" | "indoor" | "seasonal" | "aquatic" | "climber";
export type FlowerCare = {
  readonly id: string;
  readonly name: string;
  readonly scientificNames: readonly string[];
  readonly category: FlowerCategory;
  readonly light: string;
  readonly watering: string;
  readonly soil: string;
  readonly feeding: string;
  readonly pruning: string;
  readonly blooming: string;
  readonly commonRisks: string;
  readonly petSafety: string;
  readonly propagation: string;
  readonly tip: string;
};

export const FLOWER_CATALOG: readonly FlowerCare[] = [
  {
    "id": "rose",
    "name": "Rose",
    "scientificNames": [
      "Rosa × hybrida",
      "Rosa chinensis",
      "Rosa"
    ],
    "category": "balcony",
    "light": "4–6+ hours of direct sun; provide afternoon relief during severe heat",
    "watering": "Check the top 2–3 cm; water the root zone deeply when dry, without soaking flowers",
    "soil": "Fertile, fast-draining potting soil in a deep ventilated container",
    "feeding": "Balanced rose feed during active growth; reduce during rest",
    "pruning": "Deadhead spent blooms, remove damaged canes and prune according to variety",
    "blooming": "Seasonal flushes; many varieties bloom repeatedly",
    "commonRisks": "Black spot, powdery mildew, aphids, spider mites",
    "petSafety": "Thorns; generally low pet toxicity, but avoid pesticide-treated parts",
    "propagation": "Semi-hardwood cuttings or grafted nursery plants",
    "tip": "Water the soil, not the foliage; leave room for air around stems."
  },
  {
    "id": "hibiscus",
    "name": "Hibiscus / Gudhal",
    "scientificNames": [
      "Hibiscus rosa-sinensis"
    ],
    "category": "balcony",
    "light": "5–6 hours bright sun; shelter from harsh afternoon heat in hot regions",
    "watering": "Water when surface starts drying; flowering plants need steady moisture, never standing water",
    "soil": "Rich, open, well-drained mix; pot must have drainage",
    "feeding": "Feed lightly in the active flowering season; avoid excess nitrogen",
    "pruning": "Remove spent flowers, pinch tips and prune lightly before active growth",
    "blooming": "Warm-season flowering, often most of the year in frost-free regions",
    "commonRisks": "Aphids, whiteflies, mealybugs, leaf yellowing from wet roots",
    "petSafety": "Usually regarded as low-risk ornamental; discourage pet chewing",
    "propagation": "Stem cuttings",
    "tip": "Buds drop after abrupt temperature, light or moisture changes."
  },
  {
    "id": "jasmine",
    "name": "Arabian Jasmine / Mogra",
    "scientificNames": [
      "Jasminum sambac"
    ],
    "category": "balcony",
    "light": "4–6 hours direct morning sun; brighter sites increase blooming",
    "watering": "Water once top soil begins to dry; reduce in cooler months",
    "soil": "Loose fertile soil with good drainage",
    "feeding": "Light monthly feed during active growing season",
    "pruning": "Prune lightly after major flowering and pinch leggy tips",
    "blooming": "Warm-season, fragrant flowers in repeated flushes",
    "commonRisks": "Spider mites, scale, mealybugs, bud drop",
    "petSafety": "Generally low pet risk; confirm cultivar before ingestion",
    "propagation": "Stem layering or semi-hardwood cuttings",
    "tip": "A pot in deep shade may grow leaves but few flowers."
  },
  {
    "id": "marigold",
    "name": "Marigold / Genda",
    "scientificNames": [
      "Tagetes erecta",
      "Tagetes patula"
    ],
    "category": "seasonal",
    "light": "At least 5–6 hours full sun",
    "watering": "Let upper soil dry slightly; avoid constant saturation",
    "soil": "Ordinary, well-drained garden mix",
    "feeding": "Minimal feeding; too much nitrogen reduces flowers",
    "pruning": "Remove spent heads; pinch young tips for bushy growth",
    "blooming": "Warm-season and winter-season types depending local climate",
    "commonRisks": "Aphids, leaf spots, root rot from wet soil",
    "petSafety": "May irritate skin and cause stomach upset if eaten by pets",
    "propagation": "Seeds",
    "tip": "Good beginner container flower; protect drainage in monsoon."
  },
  {
    "id": "bougainvillea",
    "name": "Bougainvillea",
    "scientificNames": [
      "Bougainvillea glabra",
      "Bougainvillea spectabilis"
    ],
    "category": "climber",
    "light": "At least 6 hours strong sun; flowering drops in shade",
    "watering": "Water deeply, then allow upper mix to dry before next watering",
    "soil": "Very fast-draining gritty mix; avoid oversized wet pots",
    "feeding": "Modest feeding; avoid excess nitrogen",
    "pruning": "Prune after flowering flushes; train vines with gloves",
    "blooming": "Colorful bracts in warm bright conditions",
    "commonRisks": "Root rot, leaf spots, whiteflies, mealybugs",
    "petSafety": "Thorns and mildly irritating sap; keep away from children/pets",
    "propagation": "Hardwood or semi-hardwood cuttings",
    "tip": "Flowering is stronger when roots are not waterlogged."
  },
  {
    "id": "chrysanthemum",
    "name": "Chrysanthemum / Guldaudi",
    "scientificNames": [
      "Chrysanthemum morifolium"
    ],
    "category": "seasonal",
    "light": "Bright sun; provide relief during extreme afternoon heat",
    "watering": "Water as the top centimeter dries; do not wet blooms unnecessarily",
    "soil": "Fertile, well-drained potting soil",
    "feeding": "Feed modestly while buds form; pause when flowering ends",
    "pruning": "Pinch tips before bud season; remove wilted blooms",
    "blooming": "Mainly short-day winter/autumn flowering",
    "commonRisks": "Leaf miners, aphids, powdery mildew",
    "petSafety": "Toxic to cats and dogs if eaten",
    "propagation": "Cuttings or divisions",
    "tip": "Keep cool enough for buds; warmer nights can reduce flowering."
  },
  {
    "id": "orchid",
    "name": "Moth Orchid",
    "scientificNames": [
      "Phalaenopsis amabilis",
      "Phalaenopsis"
    ],
    "category": "indoor",
    "light": "Bright indirect light; avoid direct midday sun",
    "watering": "Water bark thoroughly only when nearly dry; drain completely; keep crown dry",
    "soil": "Chunky orchid bark, not ordinary dense garden soil",
    "feeding": "Weak orchid feed while actively growing; flush salts regularly",
    "pruning": "Trim brown spent spikes; do not cut green roots",
    "blooming": "Flower spikes may last weeks or months indoors",
    "commonRisks": "Crown rot, root rot, mealybugs, sun scorch",
    "petSafety": "Generally considered non-toxic to cats and dogs",
    "propagation": "Keikis or divisions where applicable",
    "tip": "Clear pot helps inspect roots; never leave roots in standing water."
  },
  {
    "id": "peace-lily",
    "name": "Peace Lily",
    "scientificNames": [
      "Spathiphyllum wallisii",
      "Spathiphyllum"
    ],
    "category": "indoor",
    "light": "Medium to bright indirect light; avoid harsh sun",
    "watering": "Water after top soil dries slightly; do not leave saucer water",
    "soil": "Moisture-retentive but airy peat-free potting blend",
    "feeding": "Dilute feeding in growing season only",
    "pruning": "Wipe leaves, remove brown spent spathes, divide when crowded",
    "blooming": "Intermittent white spathes with suitable light",
    "commonRisks": "Brown tips from salts/dry air, thrips, root rot",
    "petSafety": "Toxic to cats, dogs and children if chewed (calcium oxalate)",
    "propagation": "Division",
    "tip": "Drooping can follow dry or soggy roots; check soil before watering."
  },
  {
    "id": "anthurium",
    "name": "Anthurium / Flamingo Flower",
    "scientificNames": [
      "Anthurium andraeanum"
    ],
    "category": "indoor",
    "light": "Bright filtered light; protect from direct sun",
    "watering": "Let upper layer dry slightly; water thoroughly then drain",
    "soil": "Airy orchid-bark, coco and perlite style mix",
    "feeding": "Weak balanced feed during active growth",
    "pruning": "Remove old spathes and wipe dust from leaves",
    "blooming": "Long-lived colorful spathes when warm and bright",
    "commonRisks": "Root rot, spider mites, bacterial leaf spot",
    "petSafety": "Toxic to pets and children if chewed (calcium oxalate)",
    "propagation": "Division",
    "tip": "Avoid water on foliage overnight; improve airflow."
  },
  {
    "id": "geranium",
    "name": "Zonal Geranium",
    "scientificNames": [
      "Pelargonium × hortorum",
      "Pelargonium zonale"
    ],
    "category": "balcony",
    "light": "4–6 hours sun; afternoon shade in peak summer",
    "watering": "Allow top 2–3 cm to dry, then soak and drain",
    "soil": "Loose, fertile, well-drained mix",
    "feeding": "Light flowering feed during active season",
    "pruning": "Deadhead and pinch leggy stems",
    "blooming": "Long flowering season in mild weather",
    "commonRisks": "Botrytis, whitefly, edema in wet conditions",
    "petSafety": "Can be toxic to cats and dogs",
    "propagation": "Stem cuttings",
    "tip": "Waterlogged roots and humid still air increase stem rot."
  },
  {
    "id": "petunia",
    "name": "Petunia",
    "scientificNames": [
      "Petunia × atkinsiana",
      "Petunia hybrida"
    ],
    "category": "seasonal",
    "light": "6+ hours full sun; shade in punishing heat",
    "watering": "Water when upper soil dries; hanging baskets dry quickly",
    "soil": "Rich and free-draining potting mix",
    "feeding": "Regular modest flowering feed through bloom",
    "pruning": "Trim leggy stems and remove spent blooms as needed",
    "blooming": "Cool/mild season through warmer months where suitable",
    "commonRisks": "Aphids, mildew, caterpillars, weak flowering in shade",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Seeds or nursery transplants",
    "tip": "Shelter from prolonged heavy rain to protect blooms."
  },
  {
    "id": "zinnia",
    "name": "Zinnia",
    "scientificNames": [
      "Zinnia elegans"
    ],
    "category": "seasonal",
    "light": "6+ hours full sun with open airflow",
    "watering": "Water the base when surface becomes dry; avoid overhead soaking",
    "soil": "Average well-drained garden soil",
    "feeding": "Little fertilizer; heavy feeding grows leaves, not flowers",
    "pruning": "Deadhead to extend blooming",
    "blooming": "Warm season, summer through autumn",
    "commonRisks": "Powdery mildew, leaf spot, caterpillars",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Seeds",
    "tip": "Thin crowded plants to reduce mildew."
  },
  {
    "id": "sunflower",
    "name": "Sunflower",
    "scientificNames": [
      "Helianthus annuus"
    ],
    "category": "seasonal",
    "light": "6–8 hours direct sun; protect from wind",
    "watering": "Deep watering as soil dries; especially during buds and seed fill",
    "soil": "Well-draining fertile soil in a large deep pot",
    "feeding": "Compost or light feed; avoid excess nitrogen",
    "pruning": "Support tall cultivars and remove spent dwarf blooms",
    "blooming": "Summer/monsoon season depending sowing",
    "commonRisks": "Caterpillars, downy mildew, bird damage",
    "petSafety": "Generally non-toxic to cats and dogs",
    "propagation": "Seeds",
    "tip": "Choose dwarf cultivars for balconies; tall types need root depth."
  },
  {
    "id": "dahlia",
    "name": "Dahlia",
    "scientificNames": [
      "Dahlia pinnata",
      "Dahlia"
    ],
    "category": "seasonal",
    "light": "Morning sun and afternoon relief in very hot areas",
    "watering": "Even moisture after leaves develop; avoid soggy dormant tubers",
    "soil": "Rich, well-drained soil; good airflow",
    "feeding": "Low-nitrogen flowering feed while actively growing",
    "pruning": "Stake stems, pinch early growth, deadhead",
    "blooming": "Cooler mild months; struggles in high tropical heat",
    "commonRisks": "Earwigs, mites, powdery mildew, tuber rot",
    "petSafety": "Can cause mild stomach upset/skin irritation in pets",
    "propagation": "Tubers or cuttings",
    "tip": "Do not overwater dormant tubers in storage."
  },
  {
    "id": "lily",
    "name": "True Lily",
    "scientificNames": [
      "Lilium longiflorum",
      "Lilium asiaticum",
      "Lilium orientalis",
      "Lilium"
    ],
    "category": "seasonal",
    "light": "Bright sun on foliage, cooler shaded roots",
    "watering": "Water when top soil dries; never leave bulb in puddled soil",
    "soil": "Deep, well-drained bulb compost",
    "feeding": "Light balanced feed until leaves yellow",
    "pruning": "Remove faded flowers but keep green foliage for bulb recovery",
    "blooming": "Seasonal spring or summer by type",
    "commonRisks": "Botrytis, aphids, bulb rot",
    "petSafety": "EXTREMELY toxic to cats, including pollen and vase water",
    "propagation": "Bulb division",
    "tip": "Do not grow true lilies where cats can access them."
  },
  {
    "id": "tulip",
    "name": "Tulip",
    "scientificNames": [
      "Tulipa gesneriana",
      "Tulipa"
    ],
    "category": "seasonal",
    "light": "Full sun during cool growth; shade from hot afternoon",
    "watering": "Moderate moisture during growth; keep dormant bulbs relatively dry",
    "soil": "Gritty well-drained bulb compost",
    "feeding": "A little bulb fertilizer during active leaves",
    "pruning": "Remove faded bloom, leave leaves to yellow naturally",
    "blooming": "Cool-season flowering; needs chilling in warm climates",
    "commonRisks": "Bulb rot, aphids, heat stress",
    "petSafety": "Toxic bulbs to pets and people",
    "propagation": "Bulbs",
    "tip": "Often treated as a seasonal bulb in hot Indian cities."
  },
  {
    "id": "gerbera",
    "name": "Gerbera Daisy",
    "scientificNames": [
      "Gerbera jamesonii"
    ],
    "category": "balcony",
    "light": "Bright morning sun; shield from extreme afternoon heat",
    "watering": "Water at the edge of pot when upper soil dries; keep crown dry",
    "soil": "Airy rich soil with excellent drainage",
    "feeding": "Dilute balanced feed in growing season",
    "pruning": "Cut spent flower stalks at base; clear dead leaves",
    "blooming": "Long bloom windows in mild weather",
    "commonRisks": "Crown rot, thrips, leaf miners",
    "petSafety": "Generally non-toxic to cats and dogs",
    "propagation": "Clump division or nursery starts",
    "tip": "Set crown just above the soil line to prevent rot."
  },
  {
    "id": "carnation",
    "name": "Carnation",
    "scientificNames": [
      "Dianthus caryophyllus"
    ],
    "category": "seasonal",
    "light": "5–6 hours bright sun; prefer cooler weather",
    "watering": "Water when the upper layer dries, avoiding soggy soil",
    "soil": "Neutral to slightly alkaline, sharply drained mix",
    "feeding": "Light flowering feed, not heavy nitrogen",
    "pruning": "Pinch young plants; deadhead spent blooms",
    "blooming": "Cool/mild season flowers",
    "commonRisks": "Rust, aphids, thrips, root rot",
    "petSafety": "Mildly toxic to pets if eaten",
    "propagation": "Cuttings or seeds",
    "tip": "Give strong airflow and avoid humid crowded stems."
  },
  {
    "id": "cosmos",
    "name": "Cosmos",
    "scientificNames": [
      "Cosmos bipinnatus",
      "Cosmos sulphureus"
    ],
    "category": "seasonal",
    "light": "Full sun at least 6 hours",
    "watering": "Water when soil dries; established plants tolerate brief drought",
    "soil": "Light, well-drained soil; avoid overly rich mixes",
    "feeding": "Usually none required",
    "pruning": "Deadhead and stake tall plants in wind",
    "blooming": "Warm-season flowers until frost in temperate sites",
    "commonRisks": "Aphids, powdery mildew, lodging",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Seeds",
    "tip": "Overfeeding reduces flowering and creates floppy growth."
  },
  {
    "id": "pansy",
    "name": "Pansy",
    "scientificNames": [
      "Viola × wittrockiana"
    ],
    "category": "seasonal",
    "light": "Morning sun, afternoon shade in warm regions",
    "watering": "Keep evenly lightly moist; avoid soggy crowns",
    "soil": "Loose compost-rich, well-drained mix",
    "feeding": "Light flowering feed every few weeks while growing",
    "pruning": "Deadhead regularly",
    "blooming": "Cool winter months; short-lived in hot weather",
    "commonRisks": "Slugs, mildew, heat stress",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Seeds or nursery seedlings",
    "tip": "Plant for cooler months; high heat quickly ends bloom."
  },
  {
    "id": "calendula",
    "name": "Pot Marigold",
    "scientificNames": [
      "Calendula officinalis"
    ],
    "category": "seasonal",
    "light": "Full sun in cool weather; partial shade in warm afternoons",
    "watering": "Water when top soil dries; allow free drainage",
    "soil": "Average to moderately rich drained soil",
    "feeding": "Little feeding needed",
    "pruning": "Remove spent flower heads for more buds",
    "blooming": "Cool-season flowers",
    "commonRisks": "Aphids, powdery mildew, damping-off",
    "petSafety": "Generally low toxicity but may irritate sensitive skin",
    "propagation": "Seeds",
    "tip": "Good cool-season balcony flower; heat shortens bloom."
  },
  {
    "id": "morning-glory",
    "name": "Morning Glory",
    "scientificNames": [
      "Ipomoea purpurea"
    ],
    "category": "climber",
    "light": "6 hours or more direct sun",
    "watering": "Water when top soil dries; avoid wet feet",
    "soil": "Average well-drained soil",
    "feeding": "Usually no feeding necessary",
    "pruning": "Train on a trellis; remove seed pods to limit spread",
    "blooming": "Morning flowers through warm season",
    "commonRisks": "Aphids, spider mites, rust",
    "petSafety": "Seeds may be toxic if ingested; keep away from children/pets",
    "propagation": "Seeds",
    "tip": "Can self-seed aggressively; check local invasive guidance."
  },
  {
    "id": "hydrangea",
    "name": "Bigleaf Hydrangea",
    "scientificNames": [
      "Hydrangea macrophylla"
    ],
    "category": "balcony",
    "light": "Bright morning light; cool afternoon shade",
    "watering": "Keep soil evenly moist; avoid complete drying and standing water",
    "soil": "Organic-rich moisture-retaining yet drained soil",
    "feeding": "Light balanced feeding in active season",
    "pruning": "Prune only after checking whether cultivar blooms on old wood",
    "blooming": "Seasonal clusters in mild climates",
    "commonRisks": "Leaf scorch, mildew, wilting in heat",
    "petSafety": "Toxic to pets if eaten",
    "propagation": "Softwood cuttings",
    "tip": "Flower color depends on variety and available aluminum/soil chemistry, not just a single pH change."
  },
  {
    "id": "lavender",
    "name": "English Lavender",
    "scientificNames": [
      "Lavandula angustifolia"
    ],
    "category": "balcony",
    "light": "6–8 hours sun and excellent airflow",
    "watering": "Let much of the soil dry before watering again",
    "soil": "Gritty low-fertility fast-draining soil",
    "feeding": "Very little fertilizer",
    "pruning": "Trim lightly after flowering; avoid cutting old bare wood",
    "blooming": "Fragrant flowers in cool/dry Mediterranean-like weather",
    "commonRisks": "Root rot from humidity, spittlebugs",
    "petSafety": "May upset cats and dogs if eaten",
    "propagation": "Cuttings",
    "tip": "Difficult in humid tropical monsoon conditions; protect from prolonged rain."
  },
  {
    "id": "gardenia",
    "name": "Gardenia",
    "scientificNames": [
      "Gardenia jasminoides"
    ],
    "category": "balcony",
    "light": "Bright morning sun and afternoon shade",
    "watering": "Keep evenly lightly moist; avoid drought and waterlogging",
    "soil": "Acidic organic, well-drained soil",
    "feeding": "Acid-loving plant feed with iron if deficiency is confirmed",
    "pruning": "Remove spent flowers; prune after flowering",
    "blooming": "Fragrant blooms in warm mild months",
    "commonRisks": "Bud drop, scale, chlorosis in alkaline soil",
    "petSafety": "Can be toxic to dogs and cats",
    "propagation": "Semi-hardwood cuttings",
    "tip": "Hard water/alkaline soil can cause iron chlorosis; verify before treating."
  },
  {
    "id": "ixora",
    "name": "Ixora / Rangan",
    "scientificNames": [
      "Ixora coccinea"
    ],
    "category": "balcony",
    "light": "4–6 hours sun; some afternoon shade in intense heat",
    "watering": "Water when surface dries; steady moisture during flowering",
    "soil": "Acidic, rich well-drained mix",
    "feeding": "Acid-forming fertilizer sparingly during growth",
    "pruning": "Prune after flowering flushes, not heavily before buds",
    "blooming": "Colorful clusters in warm tropical regions",
    "commonRisks": "Scale, sooty mold, yellow leaves from alkaline media",
    "petSafety": "Generally considered low pet risk, but discourage chewing",
    "propagation": "Semi-hardwood cuttings",
    "tip": "Avoid liming soil; alkaline media often causes yellow new growth."
  },
  {
    "id": "plumeria",
    "name": "Frangipani / Champa",
    "scientificNames": [
      "Plumeria rubra",
      "Plumeria obtusa"
    ],
    "category": "balcony",
    "light": "6+ hours direct sun",
    "watering": "Water deeply in active leafy season; keep much drier when dormant/leafless",
    "soil": "Very free-draining gritty cactus-like mix",
    "feeding": "Light feeding in active season",
    "pruning": "Remove dead branches; allow cut ends to callus",
    "blooming": "Warm season, fragrant clusters",
    "commonRisks": "Rust, mites, stem rot",
    "petSafety": "Milky sap irritates skin; toxic to pets if ingested",
    "propagation": "Callused stem cuttings",
    "tip": "Leaf drop in cool season may be normal dormancy."
  },
  {
    "id": "adenium",
    "name": "Desert Rose",
    "scientificNames": [
      "Adenium obesum"
    ],
    "category": "balcony",
    "light": "6+ hours strong sun; heat-loving",
    "watering": "Water when mix is mostly dry in growing season; very sparingly when dormant",
    "soil": "Extremely free-draining succulent substrate",
    "feeding": "Dilute succulent feed during active growth",
    "pruning": "Prune cautiously; wear gloves for sap",
    "blooming": "Warm season flowers",
    "commonRisks": "Root/caudex rot, scale, mealybugs",
    "petSafety": "HIGHLY poisonous sap to people and pets",
    "propagation": "Cuttings or seeds",
    "tip": "Never allow prolonged standing water around the caudex."
  },
  {
    "id": "vinca",
    "name": "Madagascar Periwinkle / Sadabahar",
    "scientificNames": [
      "Catharanthus roseus"
    ],
    "category": "seasonal",
    "light": "6 hours sun, tolerates partial shade",
    "watering": "Water when top soil dries; fairly drought-tolerant when established",
    "soil": "Fast-draining modestly fertile mix",
    "feeding": "Little or moderate feeding",
    "pruning": "Pinch young tips and remove damaged branches",
    "blooming": "Warm season and almost year-round in frost-free sites",
    "commonRisks": "Stem rot in wet weather, aphids",
    "petSafety": "Toxic if ingested; contains potent alkaloids",
    "propagation": "Seed or cuttings",
    "tip": "Avoid handling as edible or medicinal without clinical advice."
  },
  {
    "id": "lotus",
    "name": "Sacred Lotus",
    "scientificNames": [
      "Nelumbo nucifera"
    ],
    "category": "aquatic",
    "light": "6–8 hours direct sun",
    "watering": "Keep container continuously flooded at suitable depth; never let rhizome dry",
    "soil": "Heavy clay-rich aquatic soil with gravel cap",
    "feeding": "Aquatic fertilizer only once established in growing season",
    "pruning": "Remove yellow leaves; maintain pond hygiene",
    "blooming": "Summer/monsoon season in warm climate",
    "commonRisks": "Aphids, leaf miners, algae",
    "petSafety": "Avoid pets accessing treated pond water",
    "propagation": "Rhizome divisions or seeds",
    "tip": "Requires a wide sealed tub; never use ordinary draining flowerpot."
  },
  {
    "id": "water-lily",
    "name": "Water Lily",
    "scientificNames": [
      "Nymphaea nouchali",
      "Nymphaea alba",
      "Nymphaea"
    ],
    "category": "aquatic",
    "light": "4–6+ hours direct sun depending variety",
    "watering": "Keep the crown submerged at appropriate depth in still water",
    "soil": "Heavy aquatic loam in an aquatic basket",
    "feeding": "Aquatic tablets after active growth starts",
    "pruning": "Remove decaying floating leaves",
    "blooming": "Warm season for tropical lilies; hardy varieties vary",
    "commonRisks": "Aphids, water-lily beetles, algae",
    "petSafety": "Water treatment chemicals can harm pets/aquatic life",
    "propagation": "Rhizome division",
    "tip": "Not the same plant as lotus; leaf/flower attachment differs."
  },
  {
    "id": "impatiens",
    "name": "Busy Lizzie / Impatiens",
    "scientificNames": [
      "Impatiens walleriana"
    ],
    "category": "seasonal",
    "light": "Bright shade or gentle morning sun",
    "watering": "Keep evenly moist but never waterlogged",
    "soil": "Organic well-drained mix",
    "feeding": "Light balanced feed while flowering",
    "pruning": "Pinch leggy tips and remove moldy leaves",
    "blooming": "Prolonged blooms in mild shady weather",
    "commonRisks": "Downy mildew, stem rot, spider mites",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Cuttings or nursery transplants",
    "tip": "Avoid overhead irrigation and crowded humid foliage."
  },
  {
    "id": "begonia",
    "name": "Wax Begonia",
    "scientificNames": [
      "Begonia semperflorens",
      "Begonia cucullata"
    ],
    "category": "indoor",
    "light": "Bright indirect light or light morning sun",
    "watering": "Allow top soil to dry slightly; avoid saturated stems",
    "soil": "Airy potting mix with perlite",
    "feeding": "Weak feed in growing season",
    "pruning": "Remove spent clusters and yellow leaves",
    "blooming": "Long flowering season indoors/outdoors in mild conditions",
    "commonRisks": "Powdery mildew, bacterial spot, stem rot",
    "petSafety": "Toxic to cats and dogs, especially underground parts",
    "propagation": "Stem cuttings",
    "tip": "Do not mist hairy leaves or keep foliage wet overnight."
  },
  {
    "id": "azalea",
    "name": "Azalea",
    "scientificNames": [
      "Rhododendron simsii",
      "Rhododendron indicum"
    ],
    "category": "balcony",
    "light": "Morning sun, bright afternoon shade; cool conditions",
    "watering": "Even moisture with drainage; rootball must not become bone-dry",
    "soil": "Acidic peat-free ericaceous potting mix",
    "feeding": "Acid-loving feed after bloom, sparingly",
    "pruning": "Deadhead; prune promptly after flowering",
    "blooming": "Cool-season spring flowering",
    "commonRisks": "Lace bugs, root rot, chlorosis",
    "petSafety": "HIGHLY toxic to pets and livestock if ingested",
    "propagation": "Semi-ripe cuttings",
    "tip": "Struggles in prolonged very hot humid climates; avoid alkaline tap-water buildup."
  },
  {
    "id": "camellia",
    "name": "Camellia",
    "scientificNames": [
      "Camellia japonica"
    ],
    "category": "balcony",
    "light": "Bright dappled light; protection from hot afternoon sun",
    "watering": "Keep evenly moist with excellent drainage",
    "soil": "Acidic compost-rich ericaceous medium",
    "feeding": "Light acid-loving feed after flowering",
    "pruning": "Light shaping after flowering, remove damaged stems",
    "blooming": "Cool-season winter/spring bloom",
    "commonRisks": "Tea scale, bud drop, sooty mold",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Cuttings",
    "tip": "Bud drop may follow changes in watering, heat or moving pot."
  },
  {
    "id": "verbena",
    "name": "Garden Verbena",
    "scientificNames": [
      "Verbena × hybrida",
      "Glandularia × hybrida"
    ],
    "category": "seasonal",
    "light": "6+ hours direct sun",
    "watering": "Let topsoil dry a little; water at root level",
    "soil": "Very free-draining mix",
    "feeding": "Light regular flowering feed",
    "pruning": "Trim spent clusters and leggy growth",
    "blooming": "Seasonal extended warm-weather bloom",
    "commonRisks": "Powdery mildew, spider mites",
    "petSafety": "Some verbena species can upset pets; avoid ingestion",
    "propagation": "Cuttings or seeds",
    "tip": "Give excellent airflow and avoid splashing leaves."
  },
  {
    "id": "salvia",
    "name": "Scarlet Sage",
    "scientificNames": [
      "Salvia splendens"
    ],
    "category": "seasonal",
    "light": "Full sun to bright part shade in hot climates",
    "watering": "Water when surface dries; avoid prolonged drought",
    "soil": "Fertile but well-drained soil",
    "feeding": "Moderate feed in active growth",
    "pruning": "Pinch tips, remove dead flower spikes",
    "blooming": "Warm season spikes; may continue in mild climate",
    "commonRisks": "Aphids, spider mites, root rot",
    "petSafety": "Species-dependent; discourage pet chewing",
    "propagation": "Seeds or cuttings",
    "tip": "Pollinator-friendly but protect young transplants from waterlogging."
  },
  {
    "id": "snapdragon",
    "name": "Snapdragon",
    "scientificNames": [
      "Antirrhinum majus"
    ],
    "category": "seasonal",
    "light": "Full sun in cool weather, afternoon shade in heat",
    "watering": "Water when surface begins to dry",
    "soil": "Rich fast-draining soil",
    "feeding": "Modest bloom feed",
    "pruning": "Pinch young tips; deadhead spikes",
    "blooming": "Winter/spring in warm Indian cities",
    "commonRisks": "Rust, aphids, powdery mildew",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Seeds",
    "tip": "Heat shortens flowering; best grown as a cool-season annual."
  },
  {
    "id": "celosia",
    "name": "Cockscomb / Celosia",
    "scientificNames": [
      "Celosia argentea",
      "Celosia cristata"
    ],
    "category": "seasonal",
    "light": "6 hours or more bright sun",
    "watering": "Water when topsoil dries; avoid wet soggy crowns",
    "soil": "Light to moderately rich drained mix",
    "feeding": "Light feed during rapid growth",
    "pruning": "Remove damaged flowers; stake tall varieties",
    "blooming": "Warm season vivid plumes/combs",
    "commonRisks": "Root rot, aphids, mites",
    "petSafety": "Generally low pet toxicity",
    "propagation": "Seeds",
    "tip": "Loves warmth but needs drainage during monsoon."
  },
  {
    "id": "butterfly-pea",
    "name": "Butterfly Pea / Aparajita",
    "scientificNames": [
      "Clitoria ternatea"
    ],
    "category": "climber",
    "light": "4–6+ hours bright sun",
    "watering": "Water when top soil is dry; avoid pooling",
    "soil": "Average, moderately fertile well-drained mix",
    "feeding": "Usually compost sufficient; avoid high nitrogen",
    "pruning": "Train on trellis and trim straggly shoots",
    "blooming": "Warm-season blue or white flowers",
    "commonRisks": "Aphids, caterpillars, root rot",
    "petSafety": "Avoid unsupervised pet ingestion",
    "propagation": "Seeds or cuttings",
    "tip": "A climbing vine; give vertical support, not a small unsupported pot."
  },
  {
    "id": "tuberose",
    "name": "Tuberose / Rajnigandha",
    "scientificNames": [
      "Agave amica",
      "Polianthes tuberosa"
    ],
    "category": "balcony",
    "light": "6+ hours direct sun",
    "watering": "Keep lightly moist during active growth; reduce after foliage dies",
    "soil": "Loose fertile, well-drained bulb medium",
    "feeding": "Balanced feed once growth starts",
    "pruning": "Remove spent stalks but retain green leaves",
    "blooming": "Fragrant late summer/monsoon flowers",
    "commonRisks": "Thrips, bulb rot, aphids",
    "petSafety": "Plant parts may upset pets if eaten",
    "propagation": "Bulb offsets",
    "tip": "Dormant bulbs rot if left waterlogged."
  },
  {
    "id": "crossandra",
    "name": "Crossandra / Kanakambaram",
    "scientificNames": [
      "Crossandra infundibuliformis"
    ],
    "category": "balcony",
    "light": "Bright morning sun or filtered light; shade from intense afternoon sun",
    "watering": "Keep evenly moist with drainage; avoid drying to wilt",
    "soil": "Rich, well-drained tropical potting mix",
    "feeding": "Light regular feed in active season",
    "pruning": "Pinch tips to encourage side branches",
    "blooming": "Warm-season orange, salmon or yellow flowers",
    "commonRisks": "Mealybugs, spider mites, root rot",
    "petSafety": "Limited pet-toxicity data; prevent chewing",
    "propagation": "Cuttings or seeds",
    "tip": "Prefers warmth and sheltered balconies, not cold drafts."
  },
  {
    "id": "allamanda",
    "name": "Golden Trumpet",
    "scientificNames": [
      "Allamanda cathartica"
    ],
    "category": "climber",
    "light": "6+ hours sun for strongest blooms",
    "watering": "Water as the top few centimeters dry; reduce in cool weather",
    "soil": "Rich but sharply drained mix in a large pot",
    "feeding": "Feed modestly during active growth",
    "pruning": "Train vines and prune after flowering",
    "blooming": "Warm-season yellow trumpet flowers",
    "commonRisks": "Aphids, whiteflies, scale",
    "petSafety": "TOXIC milky sap can irritate skin and cause poisoning if eaten",
    "propagation": "Stem cuttings",
    "tip": "Wear gloves when pruning and keep from children/pets."
  },
  {
    "id": "ranunculus",
    "name": "Persian Buttercup",
    "scientificNames": [
      "Ranunculus asiaticus"
    ],
    "category": "seasonal",
    "light": "Bright sun in cool climate, shade from midday heat",
    "watering": "Water moderately while growing; keep resting corms dry",
    "soil": "Gritty organic well-drained mix",
    "feeding": "Light feed as buds emerge",
    "pruning": "Deadhead and keep leaves until yellow",
    "blooming": "Cool-season spring blooms",
    "commonRisks": "Aphids, powdery mildew, corm rot",
    "petSafety": "Toxic if eaten; sap may irritate skin",
    "propagation": "Corms",
    "tip": "Needs cool growing season; warm-city cultivation is seasonal."
  },
  {
    "id": "fuchsia",
    "name": "Fuchsia",
    "scientificNames": [
      "Fuchsia hybrida",
      "Fuchsia magellanica"
    ],
    "category": "balcony",
    "light": "Bright shade or morning sun; avoid hot afternoon exposure",
    "watering": "Consistent moisture with good drainage; check often in heat",
    "soil": "Rich airy moisture-holding mix",
    "feeding": "Dilute feed during active flowering",
    "pruning": "Pinch new tips, remove faded blooms",
    "blooming": "Long flowering in cool mild weather",
    "commonRisks": "Whiteflies, spider mites, root rot",
    "petSafety": "Generally considered low pet toxicity",
    "propagation": "Softwood cuttings",
    "tip": "Usually unsuitable for unshaded hot balconies in Hyderabad summer."
  },
  {
    "id": "clematis",
    "name": "Clematis",
    "scientificNames": [
      "Clematis × jackmanii",
      "Clematis florida"
    ],
    "category": "climber",
    "light": "Sun on stems, cool shaded root zone",
    "watering": "Water deeply when upper soil dries; do not waterlog",
    "soil": "Deep fertile well-drained mix",
    "feeding": "Balanced low-moderate feeding",
    "pruning": "Pruning group depends on cultivar; identify before cutting",
    "blooming": "Seasonal spring/summer flowers depending variety",
    "commonRisks": "Clematis wilt, slugs, aphids",
    "petSafety": "Toxic to pets if eaten; irritant sap",
    "propagation": "Cuttings or layering",
    "tip": "Provide trellis and shaded root mulch; bloom-pruning group varies."
  }
] as const;

export const FLOWER_CATEGORIES: Readonly<Record<FlowerCategory, string>> = {
  balcony: "Balcony & terrace",
  indoor: "Indoor flowering",
  seasonal: "Seasonal flowers",
  aquatic: "Pond & aquatic",
  climber: "Climbing flowers",
};

/** Match ONLY a scientific genus/species name as a whole taxon, not a fuzzy substring.
 * Genus-only matches are ignored when multiple catalogue species would be plausible.
 */
export function findFlowerFromScientificName(value: string | null | undefined): FlowerCare | null {
  const cleaned = (value ?? "").normalize("NFKC").replace(/[×]/g, "x").trim().toLowerCase();
  if (!cleaned) return null;
  const matches = FLOWER_CATALOG.filter(item => item.scientificNames.some(alias => {
    const canonical = alias.normalize("NFKC").replace(/[×]/g, "x").toLowerCase();
    const parts = canonical.split(/\s+/);
    // No genus-only fallback: e.g. a result of 'Rhododendron' cannot confirm azalea.
    if (parts.length < 2) return false;
    return cleaned === canonical || cleaned.startsWith(canonical + " ");
  }));
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

export function getFlowerById(id: string): FlowerCare | null {
  return FLOWER_CATALOG.find(plant => plant.id === id) ?? null;
}
