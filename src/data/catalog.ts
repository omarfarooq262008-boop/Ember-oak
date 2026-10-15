/**
 * Demo catalog — mirrors seed SQL. Used when Supabase is unavailable
 * and as the source of truth for seed scripts.
 * No fake reviews: review arrays stay empty until moderated DB reviews exist.
 */
import type {
  Category,
  Collection,
  Product,
  ProductImage,
  ProductVariant,
  DiscountCode,
} from '@/types'

const img = (id: string, w = 800, h = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`

export const categories: Category[] = [
  {
    id: 'cat-candles',
    slug: 'candles',
    name: 'Candles',
    description: 'Soy-blend candles poured in small batches for slow evenings.',
    image_url: img('photo-1603006905004-abe479046317'),
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'cat-diffusers',
    slug: 'diffusers',
    name: 'Diffusers',
    description: 'Reed and ceramic diffusers that scent a room without flame.',
    image_url: img('photo-1608571423902-eed4a5ad8108', 800, 1000),
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'cat-ceramics',
    slug: 'ceramics',
    name: 'Ceramics',
    description: 'Hand-finished vessels, trays, and holders in warm glazes.',
    image_url: img('photo-1578749556568-bc2c40e68b61'),
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'cat-throws',
    slug: 'throws',
    name: 'Throws',
    description: 'Soft throws and textiles for layered, lived-in rooms.',
    image_url: img('photo-1584100936595-c0654b55a2e2'),
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'cat-sets',
    slug: 'gift-sets',
    name: 'Gift Sets',
    description: 'Curated pairings ready to wrap and give.',
    image_url: img('photo-1549465220-1a8b9238cd48'),
    sort_order: 5,
    is_active: true,
  },
]

export const collections: Collection[] = [
  {
    id: 'col-amber',
    slug: 'amber-hours',
    name: 'Amber Hours',
    description: 'Warm resinous notes and honeyed light for late afternoons.',
    image_url: img('photo-1603006905004-abe479046317', 1200, 675),
    featured: true,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'col-clay',
    slug: 'clay-studio',
    name: 'Clay Studio',
    description: 'Stoneware forms with matte glazes and quiet edges.',
    image_url: img('photo-1610701596007-11502861dcfa', 1200, 675),
    featured: true,
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'col-linen',
    slug: 'linen-light',
    name: 'Linen & Light',
    description: 'Soft textiles and pale ceramics for airy rooms.',
    image_url: img('photo-1616486338812-3dadae4b4ace', 1200, 675),
    featured: true,
    sort_order: 3,
    is_active: true,
  },
]

type SeedProduct = {
  id: string
  slug: string
  name: string
  short_description: string
  description: string
  category_id: string
  materials: string
  dimensions: string
  care: string
  tags: string[]
  is_featured: boolean
  is_bestseller: boolean
  collection_ids: string[]
  images: { url: string; alt: string }[]
  variants: {
    sku: string
    options: Record<string, string>
    price: number
    compare_at_price?: number
    stock: number
  }[]
}

const seedProducts: SeedProduct[] = [
  {
    id: 'p-01',
    slug: 'sandalwood-ember-candle',
    name: 'Sandalwood Ember Candle',
    short_description: 'Creamy sandalwood with a soft smoke finish.',
    description:
      'A slow-burning soy-blend candle poured into a matte charcoal vessel. Notes of Mysore sandalwood, warm cedar, and a whisper of ember. Designed for living rooms and evening reading corners.',
    category_id: 'cat-candles',
    materials: 'Soy-blend wax, cotton wick, ceramic vessel',
    dimensions: 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g',
    care: 'Trim wick to 5 mm before each burn. First burn: allow full melt pool (2–3 hours). Never leave unattended.',
    tags: ['sandalwood', 'bestseller', 'amber-hours'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1603006905004-abe479046317'), alt: 'Sandalwood Ember candle in warm window light' },
      { url: img('photo-1602874801006-e6c27c7430df'), alt: 'Sandalwood Ember candle lit detail' },
    ],
    variants: [
      { sku: 'CND-SE-220', options: { size: '220 g', scent: 'Sandalwood Ember' }, price: 4500, stock: 28 },
      { sku: 'CND-SE-450', options: { size: '450 g', scent: 'Sandalwood Ember' }, price: 7200, compare_at_price: 8000, stock: 12 },
    ],
  },
  {
    id: 'p-02',
    slug: 'bergamot-cedar-candle',
    name: 'Bergamot & Cedar Candle',
    short_description: 'Bright citrus opening into dry cedar.',
    description:
      'An uplifting day candle: Italian bergamot, green leaf, and dry Atlas cedar. Clean burn in a warm ivory vessel that works as a vase after the wax is gone.',
    category_id: 'cat-candles',
    materials: 'Soy-blend wax, cotton wick, ceramic vessel',
    dimensions: 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g',
    care: 'Trim wick to 5 mm. Burn on a heat-safe surface. Extinguish with snuffer when possible.',
    tags: ['citrus', 'cedar'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1602874801006-e6c27c7430df'), alt: 'Bergamot and Cedar candle on linen' },
      { url: img('photo-1594035910387-fea47794261f'), alt: 'Bergamot candle top view' },
    ],
    variants: [
      { sku: 'CND-BC-220', options: { size: '220 g', scent: 'Bergamot Cedar' }, price: 4200, stock: 34 },
      { sku: 'CND-BC-450', options: { size: '450 g', scent: 'Bergamot Cedar' }, price: 6900, stock: 8 },
    ],
  },
  {
    id: 'p-03',
    slug: 'fig-leaf-candle',
    name: 'Fig Leaf Candle',
    short_description: 'Green fig, soft wood, and sun-warmed stone.',
    description:
      'Inspired by courtyard gardens — crushed fig leaf, milky sap, and sun-baked terracotta. A signature scent for open-plan rooms.',
    category_id: 'cat-candles',
    materials: 'Soy-blend wax, cotton wick, ceramic vessel',
    dimensions: 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g',
    care: 'Keep away from drafts. Do not burn more than 4 hours at a time.',
    tags: ['fig', 'green'],
    is_featured: false,
    is_bestseller: true,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1572726729207-a78d6feb18d7'), alt: 'Fig Leaf candle beside ceramics' },
      { url: img('photo-1603006905004-abe479046317'), alt: 'Fig Leaf candle flame glow' },
    ],
    variants: [
      { sku: 'CND-FL-220', options: { size: '220 g', scent: 'Fig Leaf' }, price: 4400, stock: 22 },
      { sku: 'CND-FL-450', options: { size: '450 g', scent: 'Fig Leaf' }, price: 7100, stock: 3 },
    ],
  },
  {
    id: 'p-04',
    slug: 'oud-tobacco-candle',
    name: 'Oud & Tobacco Candle',
    short_description: 'Resinous oud with dried tobacco leaf.',
    description:
      'A deeper evening scent — aged oud, dried tobacco, and a hint of vanilla husk. Best in dens and libraries.',
    category_id: 'cat-candles',
    materials: 'Soy-blend wax, cotton wick, ceramic vessel',
    dimensions: 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g',
    care: 'Trim wick before every burn. Store covered when not in use.',
    tags: ['oud', 'amber-hours'],
    is_featured: true,
    is_bestseller: false,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1594035910387-fea47794261f'), alt: 'Oud and Tobacco candle in low light' },
      { url: img('photo-1602874801006-e6c27c7430df'), alt: 'Oud candle packaging detail' },
    ],
    variants: [
      { sku: 'CND-OT-220', options: { size: '220 g', scent: 'Oud Tobacco' }, price: 4800, stock: 18 },
      { sku: 'CND-OT-450', options: { size: '450 g', scent: 'Oud Tobacco' }, price: 7800, compare_at_price: 8500, stock: 6 },
    ],
  },
  {
    id: 'p-05',
    slug: 'white-tea-candle',
    name: 'White Tea Candle',
    short_description: 'Steam, pale florals, and clean linen.',
    description:
      'A quiet scent for bedrooms and studios — white tea, soft rose water, and air-dried linen.',
    category_id: 'cat-candles',
    materials: 'Soy-blend wax, cotton wick, ceramic vessel',
    dimensions: 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g',
    care: 'First burn until wax melts edge to edge.',
    tags: ['tea', 'linen-light'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1572726729207-a78d6feb18d7'), alt: 'White Tea candle on pale surface' },
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'White Tea candle in bright room' },
    ],
    variants: [
      { sku: 'CND-WT-220', options: { size: '220 g', scent: 'White Tea' }, price: 4000, stock: 40 },
    ],
  },
  {
    id: 'p-06',
    slug: 'reed-diffuser-amber',
    name: 'Amber Reed Diffuser',
    short_description: 'Continuous warm amber without a flame.',
    description:
      'Oil blend of amber resin, benzoin, and soft woods in a tinted glass bottle with natural rattan reeds. Covers medium rooms for 8–12 weeks.',
    category_id: 'cat-diffusers',
    materials: 'Fragrance oil blend, glass bottle, rattan reeds',
    dimensions: 'Bottle 200 ml · H 22 cm with reeds',
    care: 'Flip reeds weekly. Keep away from direct sunlight and pets.',
    tags: ['amber', 'reed'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1608571423902-eed4a5ad8108'), alt: 'Amber reed diffuser on wooden shelf' },
      { url: img('photo-1603006905004-abe479046317'), alt: 'Amber diffuser close-up' },
    ],
    variants: [
      { sku: 'DIF-AM-200', options: { size: '200 ml', scent: 'Amber' }, price: 5500, stock: 25 },
      { sku: 'DIF-AM-REF', options: { size: 'Refill 200 ml', scent: 'Amber' }, price: 3200, stock: 15 },
    ],
  },
  {
    id: 'p-07',
    slug: 'reed-diffuser-citrus-grove',
    name: 'Citrus Grove Diffuser',
    short_description: 'Orange blossom, peel, and green leaves.',
    description:
      'A bright hallway scent — bitter orange, neroli, and crushed leaves. Ideal near entryways.',
    category_id: 'cat-diffusers',
    materials: 'Fragrance oil blend, glass bottle, rattan reeds',
    dimensions: 'Bottle 200 ml · H 22 cm with reeds',
    care: 'Flip reeds every 5–7 days for stronger throw.',
    tags: ['citrus', 'reed'],
    is_featured: false,
    is_bestseller: true,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1608571423902-eed4a5ad8108'), alt: 'Citrus Grove diffuser in morning light' },
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Diffuser styling with linen' },
    ],
    variants: [
      { sku: 'DIF-CG-200', options: { size: '200 ml', scent: 'Citrus Grove' }, price: 5200, stock: 20 },
    ],
  },
  {
    id: 'p-08',
    slug: 'ceramic-diffuser-stone',
    name: 'Stone Ceramic Diffuser',
    short_description: 'Matte stoneware vessel with reed set.',
    description:
      'Hand-finished stoneware diffuser in ash glaze. Includes 200 ml oil (choose scent) and reeds. The vessel remains a decorative object after use.',
    category_id: 'cat-diffusers',
    materials: 'Stoneware ceramic, fragrance oil, rattan reeds',
    dimensions: 'Vessel Ø 9 cm × H 12 cm · 200 ml fill',
    care: 'Wipe ceramic with dry cloth. Do not dishwasher.',
    tags: ['ceramic', 'clay-studio'],
    is_featured: true,
    is_bestseller: false,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1610701596007-11502861dcfa'), alt: 'Stone ceramic diffuser vessel' },
      { url: img('photo-1578749556568-bc2c40e68b61'), alt: 'Ceramic diffuser detail glaze' },
    ],
    variants: [
      { sku: 'DIF-ST-AMB', options: { color: 'Ash', scent: 'Amber' }, price: 6800, stock: 14 },
      { sku: 'DIF-ST-FIG', options: { color: 'Ash', scent: 'Fig Leaf' }, price: 6800, stock: 9 },
      { sku: 'DIF-ST-OUT', options: { color: 'Sand', scent: 'Amber' }, price: 6800, stock: 0 },
    ],
  },
  {
    id: 'p-09',
    slug: 'matte-bowl-large',
    name: 'Matte Serving Bowl',
    short_description: 'Wide stoneware bowl for fruit or display.',
    description:
      'Thrown and glazed in our studio partners’ workshop. Matte exterior, soft satin interior. Food-safe.',
    category_id: 'cat-ceramics',
    materials: 'High-fired stoneware, food-safe glaze',
    dimensions: 'Ø 28 cm × H 9 cm',
    care: 'Dishwasher safe on gentle cycle. Avoid thermal shock.',
    tags: ['bowl', 'clay-studio'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1578749556568-bc2c40e68b61'), alt: 'Large matte ceramic serving bowl' },
      { url: img('photo-1610701596007-11502861dcfa'), alt: 'Bowl stacked with ceramics' },
    ],
    variants: [
      { sku: 'CER-MB-ASH', options: { size: 'Large', color: 'Ash' }, price: 6200, stock: 11 },
      { sku: 'CER-MB-CLY', options: { size: 'Large', color: 'Clay' }, price: 6200, stock: 7 },
      { sku: 'CER-MB-IVO', options: { size: 'Large', color: 'Ivory' }, price: 6200, stock: 16 },
    ],
  },
  {
    id: 'p-10',
    slug: 'candle-holder-pair',
    name: 'Taper Holder Pair',
    short_description: 'Two sculptural holders for dinner tapers.',
    description:
      'Asymmetric pair in raw clay finish. Designed to sit together or apart on a long table.',
    category_id: 'cat-ceramics',
    materials: 'Unglazed stoneware with sealed base',
    dimensions: 'Each approx. H 12–15 cm',
    care: 'Wipe with damp cloth. Not for outdoor use in rain.',
    tags: ['holder', 'dining'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1602874801006-e6c27c7430df'), alt: 'Pair of ceramic taper holders' },
      { url: img('photo-1610701596007-11502861dcfa'), alt: 'Taper holders styled on table' },
    ],
    variants: [
      { sku: 'CER-TH-RAW', options: { color: 'Raw Clay' }, price: 3800, stock: 19 },
      { sku: 'CER-TH-BLK', options: { color: 'Charcoal' }, price: 3800, stock: 2 },
    ],
  },
  {
    id: 'p-11',
    slug: 'incense-tray',
    name: 'Incense Catch Tray',
    short_description: 'Shallow tray for incense and small objects.',
    description:
      'A quiet rectangle in speckled glaze — for incense ash, keys, or jewellery by the door.',
    category_id: 'cat-ceramics',
    materials: 'Stoneware, speckled glaze',
    dimensions: 'L 18 cm × W 10 cm × H 2 cm',
    care: 'Hand wash. Avoid abrasive pads.',
    tags: ['tray', 'incense'],
    is_featured: false,
    is_bestseller: true,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1610701596007-11502861dcfa'), alt: 'Speckled ceramic incense tray' },
      { url: img('photo-1578749556568-bc2c40e68b61'), alt: 'Tray with incense stick' },
    ],
    variants: [
      { sku: 'CER-IT-SPK', options: { color: 'Speckled' }, price: 2400, stock: 30 },
    ],
  },
  {
    id: 'p-12',
    slug: 'vase-column',
    name: 'Column Vase',
    short_description: 'Tall narrow vase for single stems.',
    description:
      'Architectural column form in ivory glaze. Holds one or two stems with presence.',
    category_id: 'cat-ceramics',
    materials: 'Stoneware, ivory glaze',
    dimensions: 'Ø 7 cm × H 28 cm',
    care: 'Hand wash. Fill only halfway for stability.',
    tags: ['vase', 'linen-light'],
    is_featured: true,
    is_bestseller: false,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1581783342308-f792dbdd27c5'), alt: 'Tall ivory column vase' },
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Column vase with dried stem' },
    ],
    variants: [
      { sku: 'CER-CV-IVO', options: { color: 'Ivory', size: 'Tall' }, price: 5100, stock: 13 },
      { sku: 'CER-CV-SND', options: { color: 'Sand', size: 'Tall' }, price: 5100, stock: 5 },
    ],
  },
  {
    id: 'p-13',
    slug: 'wool-throw-camel',
    name: 'Camel Wool Throw',
    short_description: 'Dense weave throw in warm camel.',
    description:
      'A substantial throw for sofas and reading chairs. Soft hand, clean fringe, no synthetic itch.',
    category_id: 'cat-throws',
    materials: '70% wool, 30% cotton',
    dimensions: '130 × 180 cm',
    care: 'Dry clean or cold hand wash. Lay flat to dry. Do not tumble.',
    tags: ['wool', 'camel'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1584100936595-c0654b55a2e2'), alt: 'Camel wool throw folded on sofa' },
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Throw draped over armchair' },
    ],
    variants: [
      { sku: 'THR-CW-CAM', options: { color: 'Camel', size: '130×180' }, price: 8900, compare_at_price: 9800, stock: 10 },
      { sku: 'THR-CW-CHR', options: { color: 'Charcoal', size: '130×180' }, price: 8900, stock: 8 },
    ],
  },
  {
    id: 'p-14',
    slug: 'linen-throw-ivory',
    name: 'Stonewashed Linen Throw',
    short_description: 'Breathable linen with soft fringe.',
    description:
      'Pre-washed linen that softens further with every wash. Ideal for beds and summer sofas.',
    category_id: 'cat-throws',
    materials: '100% European flax linen',
    dimensions: '140 × 200 cm',
    care: 'Machine wash cold gentle. Line dry. Iron on linen setting if desired.',
    tags: ['linen', 'linen-light'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Ivory stonewashed linen throw' },
      { url: img('photo-1584100936595-c0654b55a2e2'), alt: 'Linen throw texture close-up' },
    ],
    variants: [
      { sku: 'THR-LN-IVO', options: { color: 'Ivory', size: '140×200' }, price: 7500, stock: 17 },
      { sku: 'THR-LN-SAG', options: { color: 'Sage', size: '140×200' }, price: 7500, stock: 4 },
    ],
  },
  {
    id: 'p-15',
    slug: 'knit-bolster',
    name: 'Rib Knit Bolster',
    short_description: 'Cylindrical bolster in chunky rib.',
    description:
      'A supportive bolster for sofas and daybeds. Removable cover with hidden zip.',
    category_id: 'cat-throws',
    materials: 'Acrylic-wool blend cover, polyester fill',
    dimensions: 'Ø 18 cm × L 50 cm',
    care: 'Cover: cold wash. Insert: spot clean only.',
    tags: ['bolster', 'soft'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1584100936595-c0654b55a2e2'), alt: 'Rib knit bolster on daybed' },
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Bolster styling detail' },
    ],
    variants: [
      { sku: 'THR-RB-OAT', options: { color: 'Oat' }, price: 4200, stock: 21 },
      { sku: 'THR-RB-SLATE', options: { color: 'Slate' }, price: 4200, stock: 0 },
    ],
  },
  {
    id: 'p-16',
    slug: 'evening-ritual-set',
    name: 'Evening Ritual Set',
    short_description: 'Candle, diffuser refill, and matches.',
    description:
      'Our most-gifted set: Sandalwood Ember 220 g candle, Amber diffuser refill, and brass-tipped matches in a kraft box.',
    category_id: 'cat-sets',
    materials: 'See individual products',
    dimensions: 'Gift box 28 × 20 × 12 cm',
    care: 'See enclosed care cards for each item.',
    tags: ['gift', 'set', 'bestseller'],
    is_featured: true,
    is_bestseller: true,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1549465220-1a8b9238cd48'), alt: 'Evening Ritual gift set box' },
      { url: img('photo-1603006905004-abe479046317'), alt: 'Set contents arranged' },
    ],
    variants: [
      { sku: 'SET-ER-01', options: { size: 'Standard' }, price: 9800, compare_at_price: 11200, stock: 15 },
    ],
  },
  {
    id: 'p-17',
    slug: 'host-table-set',
    name: 'Host Table Set',
    short_description: 'Bowl, taper holders, and dinner candles.',
    description:
      'For hosts: Matte Serving Bowl (Ash), Taper Holder Pair (Raw), and four beeswax dinner tapers.',
    category_id: 'cat-sets',
    materials: 'Stoneware + beeswax tapers',
    dimensions: 'Gift box 40 × 30 × 15 cm',
    care: 'See enclosed care cards.',
    tags: ['gift', 'dining'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1549465220-1a8b9238cd48'), alt: 'Host Table gift set' },
      { url: img('photo-1578749556568-bc2c40e68b61'), alt: 'Host set table styling' },
    ],
    variants: [
      { sku: 'SET-HT-01', options: { size: 'Standard' }, price: 12500, stock: 7 },
    ],
  },
  {
    id: 'p-18',
    slug: 'quiet-bedroom-set',
    name: 'Quiet Bedroom Set',
    short_description: 'White Tea candle and linen throw.',
    description:
      'A calmer bedroom pairing: White Tea 220 g candle and Stonewashed Linen Throw in Ivory.',
    category_id: 'cat-sets',
    materials: 'See individual products',
    dimensions: 'Gift box 45 × 35 × 12 cm',
    care: 'See enclosed care cards.',
    tags: ['gift', 'bedroom', 'linen-light'],
    is_featured: true,
    is_bestseller: false,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Quiet Bedroom set styling' },
      { url: img('photo-1549465220-1a8b9238cd48'), alt: 'Quiet Bedroom set packaging' },
    ],
    variants: [
      { sku: 'SET-QB-01', options: { size: 'Standard' }, price: 10800, compare_at_price: 11500, stock: 9 },
    ],
  },
  {
    id: 'p-19',
    slug: 'travel-tin-trio',
    name: 'Travel Tin Trio',
    short_description: 'Three 60 g tins in signature scents.',
    description:
      'Sandalwood Ember, Fig Leaf, and White Tea in portable tins — for guest rooms, desks, and trips.',
    category_id: 'cat-candles',
    materials: 'Soy-blend wax, aluminium tin',
    dimensions: 'Each tin Ø 6.5 cm · 60 g',
    care: 'Burn on heat-safe surface. Tin may become hot.',
    tags: ['travel', 'gift'],
    is_featured: false,
    is_bestseller: true,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1602874801006-e6c27c7430df'), alt: 'Three travel candle tins' },
      { url: img('photo-1594035910387-fea47794261f'), alt: 'Travel tin open' },
    ],
    variants: [
      { sku: 'CND-TT-03', options: { size: '3 × 60 g' }, price: 3900, stock: 32 },
    ],
  },
  {
    id: 'p-20',
    slug: 'room-spray-linen',
    name: 'Linen Room Spray',
    short_description: 'Fine mist for textiles and air.',
    description:
      'Alcohol-light mist with white tea and cotton notes. Spritz pillows, curtains, and entryways.',
    category_id: 'cat-diffusers',
    materials: 'Fragrance blend, glass bottle with atomiser',
    dimensions: '100 ml',
    care: 'Patch-test fabrics. Avoid silk and open flame.',
    tags: ['spray', 'linen-light'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1608571423902-eed4a5ad8108'), alt: 'Linen room spray bottle' },
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Room spray mist styling' },
    ],
    variants: [
      { sku: 'SPR-LN-100', options: { size: '100 ml', scent: 'Linen' }, price: 2800, stock: 45 },
    ],
  },
  {
    id: 'p-21',
    slug: 'match-jar-brass',
    name: 'Brass Match Jar',
    short_description: 'Strike-on-bottle matches in brass lid jar.',
    description:
      'Long matches in a clear jar with brass lid and strike strip. A small ritual object beside any candle.',
    category_id: 'cat-ceramics',
    materials: 'Glass, brass, safety matches',
    dimensions: 'Jar H 12 cm · ~60 matches',
    care: 'Keep dry. Keep away from children.',
    tags: ['matches', 'accent'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1603006905004-abe479046317'), alt: 'Brass lid match jar beside candle' },
      { url: img('photo-1594035910387-fea47794261f'), alt: 'Match jar detail' },
    ],
    variants: [
      { sku: 'ACC-MJ-01', options: { color: 'Brass' }, price: 1800, stock: 50 },
      { sku: 'ACC-MJ-REF', options: { color: 'Refill matches' }, price: 600, stock: 80 },
    ],
  },
  {
    id: 'p-22',
    slug: 'snuffer-bell',
    name: 'Bell Candle Snuffer',
    short_description: 'Brass-tone snuffer to end burns cleanly.',
    description:
      'Extinguish without smoke bloom. Weighted handle, belled cup sized for our vessels.',
    category_id: 'cat-ceramics',
    materials: 'Brass-plated steel',
    dimensions: 'L 28 cm',
    care: 'Wipe with dry cloth. Avoid abrasive polish.',
    tags: ['snuffer', 'accent'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-amber'],
    images: [
      { url: img('photo-1594035910387-fea47794261f'), alt: 'Brass candle snuffer' },
      { url: img('photo-1603006905004-abe479046317'), alt: 'Snuffer with candle' },
    ],
    variants: [
      { sku: 'ACC-SN-01', options: { color: 'Brass' }, price: 2200, stock: 27 },
    ],
  },
  {
    id: 'p-23',
    slug: 'wall-shelf-oak',
    name: 'Oak Floating Shelf',
    short_description: 'Solid oak shelf for vessels and books.',
    description:
      'A single-piece oak shelf with hidden brackets. Warm grain that pairs with our ceramics and candles.',
    category_id: 'cat-ceramics',
    materials: 'Solid oak, steel brackets',
    dimensions: 'L 60 cm × D 15 cm × T 3 cm',
    care: 'Dust regularly. Oil lightly once a year with food-safe mineral oil.',
    tags: ['shelf', 'oak'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-clay'],
    images: [
      { url: img('photo-1610701596007-11502861dcfa'), alt: 'Oak floating shelf with ceramics' },
      { url: img('photo-1578749556568-bc2c40e68b61'), alt: 'Shelf grain detail' },
    ],
    variants: [
      { sku: 'ACC-OS-60', options: { size: '60 cm' }, price: 6500, stock: 6 },
      { sku: 'ACC-OS-90', options: { size: '90 cm' }, price: 8200, stock: 3 },
    ],
  },
  {
    id: 'p-24',
    slug: 'cedar-blocks',
    name: 'Cedar Drawer Blocks',
    short_description: 'Set of four aromatic cedar blocks.',
    description:
      'Naturally aromatic cedar for drawers and wardrobes. Lightly sand every few months to refresh scent.',
    category_id: 'cat-sets',
    materials: 'Aromatic red cedar',
    dimensions: 'Each 8 × 5 × 2 cm · Set of 4',
    care: 'Sand lightly to refresh. Keep dry.',
    tags: ['cedar', 'storage'],
    is_featured: false,
    is_bestseller: false,
    collection_ids: ['col-linen'],
    images: [
      { url: img('photo-1616486338812-3dadae4b4ace'), alt: 'Cedar drawer blocks set' },
      { url: img('photo-1584100936595-c0654b55a2e2'), alt: 'Cedar blocks in linen drawer' },
    ],
    variants: [
      { sku: 'ACC-CB-04', options: { size: 'Set of 4' }, price: 1600, stock: 60 },
    ],
  },
]

function buildProducts(): Product[] {
  return seedProducts.map((sp) => {
    const images: ProductImage[] = sp.images.map((im, i) => ({
      id: `${sp.id}-img-${i}`,
      product_id: sp.id,
      url: im.url,
      alt: im.alt,
      sort_order: i,
      is_primary: i === 0,
    }))
    const variants: ProductVariant[] = sp.variants.map((v, i) => ({
      id: `${sp.id}-var-${i}`,
      product_id: sp.id,
      sku: v.sku,
      options: v.options,
      price: v.price,
      compare_at_price: v.compare_at_price ?? null,
      stock: v.stock,
      is_active: true,
    }))
    const category = categories.find((c) => c.id === sp.category_id)!
    const productCollections = collections.filter((c) =>
      sp.collection_ids.includes(c.id),
    )
    return {
      id: sp.id,
      slug: sp.slug,
      name: sp.name,
      short_description: sp.short_description,
      description: sp.description,
      category_id: sp.category_id,
      materials: sp.materials,
      dimensions: sp.dimensions,
      care: sp.care,
      tags: sp.tags,
      is_active: true,
      is_featured: sp.is_featured,
      is_bestseller: sp.is_bestseller,
      created_at: new Date(2026, 0, 1 + seedProducts.indexOf(sp)).toISOString(),
      category,
      images,
      variants,
      collections: productCollections,
      avg_rating: null,
      review_count: 0,
    }
  })
}

export const products: Product[] = buildProducts()

export const discountCodes: DiscountCode[] = [
  {
    id: 'dc-1',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    min_spend: 3000,
    max_uses: 1000,
    used_count: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-12-31T23:59:59Z',
    is_active: true,
  },
  {
    id: 'dc-2',
    code: 'EMBER500',
    type: 'fixed',
    value: 500,
    min_spend: 5000,
    max_uses: 500,
    used_count: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-12-31T23:59:59Z',
    is_active: true,
  },
  {
    id: 'dc-3',
    code: 'FREESHIP',
    type: 'fixed',
    value: 250,
    min_spend: 0,
    max_uses: null,
    used_count: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-06-30T23:59:59Z',
    is_active: true,
  },
]

export const instagramStrip = [
  { id: 'ig-1', url: img('photo-1603006905004-abe479046317', 600, 600), alt: 'Candle still life' },
  { id: 'ig-2', url: img('photo-1616486338812-3dadae4b4ace', 600, 600), alt: 'Linen and light' },
  { id: 'ig-3', url: img('photo-1578749556568-bc2c40e68b61', 600, 600), alt: 'Ceramic vessels' },
  { id: 'ig-4', url: img('photo-1584100936595-c0654b55a2e2', 600, 600), alt: 'Throw textures' },
  { id: 'ig-5', url: img('photo-1608571423902-eed4a5ad8108', 600, 600), alt: 'Diffuser styling' },
  { id: 'ig-6', url: img('photo-1549465220-1a8b9238cd48', 600, 600), alt: 'Gift wrapping' },
]

export const heroImage = {
  url: img('photo-1603006905004-abe479046317', 1920, 1080),
  alt: 'Warm candlelight across a considered living room',
}
