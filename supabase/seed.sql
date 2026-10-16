-- Ember & Oak demo seed — NO fake reviews
-- Run after schema migration. Uses fixed UUIDs for referential clarity.

truncate table
  public.collection_products,
  public.product_images,
  public.product_variants,
  public.products,
  public.collections,
  public.categories,
  public.discount_codes
cascade;

-- Categories
insert into public.categories (id, slug, name, description, image_url, sort_order) values
  ('a1000000-0000-4000-8000-000000000001', 'candles', 'Candles', 'Soy-blend candles poured in small batches for slow evenings.', '/images/candle-warm.jpg', 1),
  ('a1000000-0000-4000-8000-000000000002', 'diffusers', 'Diffusers', 'Reed and ceramic diffusers that scent a room without flame.', '/images/diffuser.jpg', 2),
  ('a1000000-0000-4000-8000-000000000003', 'ceramics', 'Ceramics', 'Hand-finished vessels, trays, and holders in warm glazes.', '/images/ceramic-bowl.jpg', 3),
  ('a1000000-0000-4000-8000-000000000004', 'throws', 'Throws', 'Soft throws and textiles for layered, lived-in rooms.', '/images/throw-texture.jpg', 4),
  ('a1000000-0000-4000-8000-000000000005', 'gift-sets', 'Gift Sets', 'Curated pairings ready to wrap and give.', '/images/gift-wrap.jpg', 5);

-- Collections
insert into public.collections (id, slug, name, description, image_url, featured, sort_order) values
  ('b1000000-0000-4000-8000-000000000001', 'amber-hours', 'Amber Hours', 'Warm resinous notes and honeyed light for late afternoons.', '/images/collection-amber.jpg', true, 1),
  ('b1000000-0000-4000-8000-000000000002', 'clay-studio', 'Clay Studio', 'Stoneware forms with matte glazes and quiet edges.', '/images/collection-clay.jpg', true, 2),
  ('b1000000-0000-4000-8000-000000000003', 'linen-light', 'Linen & Light', 'Soft textiles and pale ceramics for airy rooms.', '/images/collection-linen.jpg', true, 3);

-- Discount codes
insert into public.discount_codes (code, type, value, min_spend, max_uses, starts_at, ends_at, is_active) values
  ('WELCOME10', 'percent', 10, 3000, 1000, '2026-01-01', '2027-12-31', true),
  ('EMBER500', 'fixed', 500, 5000, 500, '2026-01-01', '2027-12-31', true),
  ('FREESHIP', 'fixed', 250, 0, null, '2026-01-01', '2027-06-30', true);

-- Products (24) — abbreviated descriptions match frontend catalog
insert into public.products (id, slug, name, short_description, description, category_id, materials, dimensions, care, tags, is_featured, is_bestseller) values
  ('c1000000-0000-4000-8000-000000000001', 'sandalwood-ember-candle', 'Sandalwood Ember Candle', 'Creamy sandalwood with a soft smoke finish.', 'A slow-burning soy-blend candle poured into a matte charcoal vessel. Notes of Mysore sandalwood, warm cedar, and a whisper of ember.', 'a1000000-0000-4000-8000-000000000001', 'Soy-blend wax, cotton wick, ceramic vessel', 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g', 'Trim wick to 5 mm before each burn.', array['sandalwood','bestseller','amber-hours'], true, true),
  ('c1000000-0000-4000-8000-000000000002', 'bergamot-cedar-candle', 'Bergamot & Cedar Candle', 'Bright citrus opening into dry cedar.', 'An uplifting day candle: Italian bergamot, green leaf, and dry Atlas cedar.', 'a1000000-0000-4000-8000-000000000001', 'Soy-blend wax, cotton wick, ceramic vessel', 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g', 'Trim wick to 5 mm.', array['citrus','cedar'], true, true),
  ('c1000000-0000-4000-8000-000000000003', 'fig-leaf-candle', 'Fig Leaf Candle', 'Green fig, soft wood, and sun-warmed stone.', 'Inspired by courtyard gardens — crushed fig leaf, milky sap, and sun-baked terracotta.', 'a1000000-0000-4000-8000-000000000001', 'Soy-blend wax, cotton wick, ceramic vessel', 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g', 'Keep away from drafts.', array['fig','green'], false, true),
  ('c1000000-0000-4000-8000-000000000004', 'oud-tobacco-candle', 'Oud & Tobacco Candle', 'Resinous oud with dried tobacco leaf.', 'A deeper evening scent — aged oud, dried tobacco, and a hint of vanilla husk.', 'a1000000-0000-4000-8000-000000000001', 'Soy-blend wax, cotton wick, ceramic vessel', 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g', 'Trim wick before every burn.', array['oud','amber-hours'], true, false),
  ('c1000000-0000-4000-8000-000000000005', 'white-tea-candle', 'White Tea Candle', 'Steam, pale florals, and clean linen.', 'A quiet scent for bedrooms and studios — white tea, soft rose water, and air-dried linen.', 'a1000000-0000-4000-8000-000000000001', 'Soy-blend wax, cotton wick, ceramic vessel', 'Vessel Ø 8.5 cm × H 9.5 cm · Net 220 g', 'First burn until wax melts edge to edge.', array['tea','linen-light'], false, false),
  ('c1000000-0000-4000-8000-000000000006', 'reed-diffuser-amber', 'Amber Reed Diffuser', 'Continuous warm amber without a flame.', 'Oil blend of amber resin, benzoin, and soft woods in a tinted glass bottle with natural rattan reeds.', 'a1000000-0000-4000-8000-000000000002', 'Fragrance oil blend, glass bottle, rattan reeds', 'Bottle 200 ml · H 22 cm with reeds', 'Flip reeds weekly.', array['amber','reed'], true, true),
  ('c1000000-0000-4000-8000-000000000007', 'reed-diffuser-citrus-grove', 'Citrus Grove Diffuser', 'Orange blossom, peel, and green leaves.', 'A bright hallway scent — bitter orange, neroli, and crushed leaves.', 'a1000000-0000-4000-8000-000000000002', 'Fragrance oil blend, glass bottle, rattan reeds', 'Bottle 200 ml · H 22 cm with reeds', 'Flip reeds every 5–7 days.', array['citrus','reed'], false, true),
  ('c1000000-0000-4000-8000-000000000008', 'ceramic-diffuser-stone', 'Stone Ceramic Diffuser', 'Matte stoneware vessel with reed set.', 'Hand-finished stoneware diffuser in ash glaze. Includes 200 ml oil and reeds.', 'a1000000-0000-4000-8000-000000000002', 'Stoneware ceramic, fragrance oil, rattan reeds', 'Vessel Ø 9 cm × H 12 cm · 200 ml fill', 'Wipe ceramic with dry cloth.', array['ceramic','clay-studio'], true, false),
  ('c1000000-0000-4000-8000-000000000009', 'matte-bowl-large', 'Matte Serving Bowl', 'Wide stoneware bowl for fruit or display.', 'Thrown and glazed in our studio partners workshop. Matte exterior, soft satin interior. Food-safe.', 'a1000000-0000-4000-8000-000000000003', 'High-fired stoneware, food-safe glaze', 'Ø 28 cm × H 9 cm', 'Dishwasher safe on gentle cycle.', array['bowl','clay-studio'], true, true),
  ('c1000000-0000-4000-8000-000000000010', 'candle-holder-pair', 'Taper Holder Pair', 'Two sculptural holders for dinner tapers.', 'Asymmetric pair in raw clay finish.', 'a1000000-0000-4000-8000-000000000003', 'Unglazed stoneware with sealed base', 'Each approx. H 12–15 cm', 'Wipe with damp cloth.', array['holder','dining'], false, false),
  ('c1000000-0000-4000-8000-000000000011', 'incense-tray', 'Incense Catch Tray', 'Shallow tray for incense and small objects.', 'A quiet rectangle in speckled glaze.', 'a1000000-0000-4000-8000-000000000003', 'Stoneware, speckled glaze', 'L 18 cm × W 10 cm × H 2 cm', 'Hand wash.', array['tray','incense'], false, true),
  ('c1000000-0000-4000-8000-000000000012', 'vase-column', 'Column Vase', 'Tall narrow vase for single stems.', 'Architectural column form in ivory glaze.', 'a1000000-0000-4000-8000-000000000003', 'Stoneware, ivory glaze', 'Ø 7 cm × H 28 cm', 'Hand wash.', array['vase','linen-light'], true, false),
  ('c1000000-0000-4000-8000-000000000013', 'wool-throw-camel', 'Camel Wool Throw', 'Dense weave throw in warm camel.', 'A substantial throw for sofas and reading chairs.', 'a1000000-0000-4000-8000-000000000004', '70% wool, 30% cotton', '130 × 180 cm', 'Dry clean or cold hand wash.', array['wool','camel'], true, true),
  ('c1000000-0000-4000-8000-000000000014', 'linen-throw-ivory', 'Stonewashed Linen Throw', 'Breathable linen with soft fringe.', 'Pre-washed linen that softens further with every wash.', 'a1000000-0000-4000-8000-000000000004', '100% European flax linen', '140 × 200 cm', 'Machine wash cold gentle.', array['linen','linen-light'], true, true),
  ('c1000000-0000-4000-8000-000000000015', 'knit-bolster', 'Rib Knit Bolster', 'Cylindrical bolster in chunky rib.', 'A supportive bolster for sofas and daybeds.', 'a1000000-0000-4000-8000-000000000004', 'Acrylic-wool blend cover, polyester fill', 'Ø 18 cm × L 50 cm', 'Cover: cold wash.', array['bolster','soft'], false, false),
  ('c1000000-0000-4000-8000-000000000016', 'evening-ritual-set', 'Evening Ritual Set', 'Candle, diffuser refill, and matches.', 'Sandalwood Ember 220 g candle, Amber diffuser refill, and brass-tipped matches.', 'a1000000-0000-4000-8000-000000000005', 'See individual products', 'Gift box 28 × 20 × 12 cm', 'See enclosed care cards.', array['gift','set','bestseller'], true, true),
  ('c1000000-0000-4000-8000-000000000017', 'host-table-set', 'Host Table Set', 'Bowl, taper holders, and dinner candles.', 'Matte Serving Bowl, Taper Holder Pair, and four beeswax dinner tapers.', 'a1000000-0000-4000-8000-000000000005', 'Stoneware + beeswax tapers', 'Gift box 40 × 30 × 15 cm', 'See enclosed care cards.', array['gift','dining'], false, false),
  ('c1000000-0000-4000-8000-000000000018', 'quiet-bedroom-set', 'Quiet Bedroom Set', 'White Tea candle and linen throw.', 'White Tea 220 g candle and Stonewashed Linen Throw in Ivory.', 'a1000000-0000-4000-8000-000000000005', 'See individual products', 'Gift box 45 × 35 × 12 cm', 'See enclosed care cards.', array['gift','bedroom','linen-light'], true, false),
  ('c1000000-0000-4000-8000-000000000019', 'travel-tin-trio', 'Travel Tin Trio', 'Three 60 g tins in signature scents.', 'Sandalwood Ember, Fig Leaf, and White Tea in portable tins.', 'a1000000-0000-4000-8000-000000000001', 'Soy-blend wax, aluminium tin', 'Each tin Ø 6.5 cm · 60 g', 'Burn on heat-safe surface.', array['travel','gift'], false, true),
  ('c1000000-0000-4000-8000-000000000020', 'room-spray-linen', 'Linen Room Spray', 'Fine mist for textiles and air.', 'Alcohol-light mist with white tea and cotton notes.', 'a1000000-0000-4000-8000-000000000002', 'Fragrance blend, glass bottle with atomiser', '100 ml', 'Patch-test fabrics.', array['spray','linen-light'], false, false),
  ('c1000000-0000-4000-8000-000000000021', 'match-jar-brass', 'Brass Match Jar', 'Strike-on-bottle matches in brass lid jar.', 'Long matches in a clear jar with brass lid and strike strip.', 'a1000000-0000-4000-8000-000000000003', 'Glass, brass, safety matches', 'Jar H 12 cm · ~60 matches', 'Keep dry.', array['matches','accent'], false, false),
  ('c1000000-0000-4000-8000-000000000022', 'snuffer-bell', 'Bell Candle Snuffer', 'Brass-tone snuffer to end burns cleanly.', 'Extinguish without smoke bloom.', 'a1000000-0000-4000-8000-000000000003', 'Brass-plated steel', 'L 28 cm', 'Wipe with dry cloth.', array['snuffer','accent'], false, false),
  ('c1000000-0000-4000-8000-000000000023', 'wall-shelf-oak', 'Oak Floating Shelf', 'Solid oak shelf for vessels and books.', 'A single-piece oak shelf with hidden brackets.', 'a1000000-0000-4000-8000-000000000003', 'Solid oak, steel brackets', 'L 60 cm × D 15 cm × T 3 cm', 'Dust regularly.', array['shelf','oak'], false, false),
  ('c1000000-0000-4000-8000-000000000024', 'cedar-blocks', 'Cedar Drawer Blocks', 'Set of four aromatic cedar blocks.', 'Naturally aromatic cedar for drawers and wardrobes.', 'a1000000-0000-4000-8000-000000000005', 'Aromatic red cedar', 'Each 8 × 5 × 2 cm · Set of 4', 'Sand lightly to refresh.', array['cedar','storage'], false, false);

-- Variants (subset of key SKUs — expand as needed; prices in PKR)
insert into public.product_variants (product_id, sku, options, price, compare_at_price, stock) values
  ('c1000000-0000-4000-8000-000000000001', 'CND-SE-220', '{"size":"220 g","scent":"Sandalwood Ember"}', 4500, null, 28),
  ('c1000000-0000-4000-8000-000000000001', 'CND-SE-450', '{"size":"450 g","scent":"Sandalwood Ember"}', 7200, 8000, 12),
  ('c1000000-0000-4000-8000-000000000002', 'CND-BC-220', '{"size":"220 g","scent":"Bergamot Cedar"}', 4200, null, 34),
  ('c1000000-0000-4000-8000-000000000002', 'CND-BC-450', '{"size":"450 g","scent":"Bergamot Cedar"}', 6900, null, 8),
  ('c1000000-0000-4000-8000-000000000003', 'CND-FL-220', '{"size":"220 g","scent":"Fig Leaf"}', 4400, null, 22),
  ('c1000000-0000-4000-8000-000000000003', 'CND-FL-450', '{"size":"450 g","scent":"Fig Leaf"}', 7100, null, 3),
  ('c1000000-0000-4000-8000-000000000004', 'CND-OT-220', '{"size":"220 g","scent":"Oud Tobacco"}', 4800, null, 18),
  ('c1000000-0000-4000-8000-000000000004', 'CND-OT-450', '{"size":"450 g","scent":"Oud Tobacco"}', 7800, 8500, 6),
  ('c1000000-0000-4000-8000-000000000005', 'CND-WT-220', '{"size":"220 g","scent":"White Tea"}', 4000, null, 40),
  ('c1000000-0000-4000-8000-000000000006', 'DIF-AM-200', '{"size":"200 ml","scent":"Amber"}', 5500, null, 25),
  ('c1000000-0000-4000-8000-000000000006', 'DIF-AM-REF', '{"size":"Refill 200 ml","scent":"Amber"}', 3200, null, 15),
  ('c1000000-0000-4000-8000-000000000007', 'DIF-CG-200', '{"size":"200 ml","scent":"Citrus Grove"}', 5200, null, 20),
  ('c1000000-0000-4000-8000-000000000008', 'DIF-ST-AMB', '{"color":"Ash","scent":"Amber"}', 6800, null, 14),
  ('c1000000-0000-4000-8000-000000000008', 'DIF-ST-FIG', '{"color":"Ash","scent":"Fig Leaf"}', 6800, null, 9),
  ('c1000000-0000-4000-8000-000000000008', 'DIF-ST-OUT', '{"color":"Sand","scent":"Amber"}', 6800, null, 0),
  ('c1000000-0000-4000-8000-000000000009', 'CER-MB-ASH', '{"size":"Large","color":"Ash"}', 6200, null, 11),
  ('c1000000-0000-4000-8000-000000000009', 'CER-MB-CLY', '{"size":"Large","color":"Clay"}', 6200, null, 7),
  ('c1000000-0000-4000-8000-000000000009', 'CER-MB-IVO', '{"size":"Large","color":"Ivory"}', 6200, null, 16),
  ('c1000000-0000-4000-8000-000000000010', 'CER-TH-RAW', '{"color":"Raw Clay"}', 3800, null, 19),
  ('c1000000-0000-4000-8000-000000000010', 'CER-TH-BLK', '{"color":"Charcoal"}', 3800, null, 2),
  ('c1000000-0000-4000-8000-000000000011', 'CER-IT-SPK', '{"color":"Speckled"}', 2400, null, 30),
  ('c1000000-0000-4000-8000-000000000012', 'CER-CV-IVO', '{"color":"Ivory","size":"Tall"}', 5100, null, 13),
  ('c1000000-0000-4000-8000-000000000012', 'CER-CV-SND', '{"color":"Sand","size":"Tall"}', 5100, null, 5),
  ('c1000000-0000-4000-8000-000000000013', 'THR-CW-CAM', '{"color":"Camel","size":"130×180"}', 8900, 9800, 10),
  ('c1000000-0000-4000-8000-000000000013', 'THR-CW-CHR', '{"color":"Charcoal","size":"130×180"}', 8900, null, 8),
  ('c1000000-0000-4000-8000-000000000014', 'THR-LN-IVO', '{"color":"Ivory","size":"140×200"}', 7500, null, 17),
  ('c1000000-0000-4000-8000-000000000014', 'THR-LN-SAG', '{"color":"Sage","size":"140×200"}', 7500, null, 4),
  ('c1000000-0000-4000-8000-000000000015', 'THR-RB-OAT', '{"color":"Oat"}', 4200, null, 21),
  ('c1000000-0000-4000-8000-000000000015', 'THR-RB-SLATE', '{"color":"Slate"}', 4200, null, 0),
  ('c1000000-0000-4000-8000-000000000016', 'SET-ER-01', '{"size":"Standard"}', 9800, 11200, 15),
  ('c1000000-0000-4000-8000-000000000017', 'SET-HT-01', '{"size":"Standard"}', 12500, null, 7),
  ('c1000000-0000-4000-8000-000000000018', 'SET-QB-01', '{"size":"Standard"}', 10800, 11500, 9),
  ('c1000000-0000-4000-8000-000000000019', 'CND-TT-03', '{"size":"3 × 60 g"}', 3900, null, 32),
  ('c1000000-0000-4000-8000-000000000020', 'SPR-LN-100', '{"size":"100 ml","scent":"Linen"}', 2800, null, 45),
  ('c1000000-0000-4000-8000-000000000021', 'ACC-MJ-01', '{"color":"Brass"}', 1800, null, 50),
  ('c1000000-0000-4000-8000-000000000021', 'ACC-MJ-REF', '{"color":"Refill matches"}', 600, null, 80),
  ('c1000000-0000-4000-8000-000000000022', 'ACC-SN-01', '{"color":"Brass"}', 2200, null, 27),
  ('c1000000-0000-4000-8000-000000000023', 'ACC-OS-60', '{"size":"60 cm"}', 6500, null, 6),
  ('c1000000-0000-4000-8000-000000000023', 'ACC-OS-90', '{"size":"90 cm"}', 8200, null, 3),
  ('c1000000-0000-4000-8000-000000000024', 'ACC-CB-04', '{"size":"Set of 4"}', 1600, null, 60);

-- Primary images
insert into public.product_images (product_id, url, alt, sort_order, is_primary)
select id,
  case slug
    when 'sandalwood-ember-candle' then '/images/candle-warm.jpg'
    when 'bergamot-cedar-candle' then '/images/candle-lit.jpg'
    when 'fig-leaf-candle' then '/images/candle-soft.jpg'
    when 'oud-tobacco-candle' then '/images/candle-dark.jpg'
    when 'white-tea-candle' then '/images/candle-soft.jpg'
    when 'reed-diffuser-amber' then '/images/diffuser.jpg'
    when 'reed-diffuser-citrus-grove' then '/images/diffuser.jpg'
    when 'ceramic-diffuser-stone' then '/images/ceramic-studio.jpg'
    when 'matte-bowl-large' then '/images/ceramic-bowl.jpg'
    when 'candle-holder-pair' then '/images/candle-lit.jpg'
    when 'incense-tray' then '/images/ceramic-studio.jpg'
    when 'vase-column' then '/images/vase-column.jpg'
    when 'wool-throw-camel' then '/images/throw-texture.jpg'
    when 'linen-throw-ivory' then '/images/linen-room.jpg'
    when 'knit-bolster' then '/images/throw-texture.jpg'
    when 'evening-ritual-set' then '/images/gift-wrap.jpg'
    when 'host-table-set' then '/images/gift-wrap.jpg'
    when 'quiet-bedroom-set' then '/images/linen-room.jpg'
    when 'travel-tin-trio' then '/images/candle-lit.jpg'
    when 'room-spray-linen' then '/images/diffuser.jpg'
    when 'match-jar-brass' then '/images/candle-warm.jpg'
    when 'snuffer-bell' then '/images/candle-dark.jpg'
    when 'wall-shelf-oak' then '/images/ceramic-studio.jpg'
    when 'cedar-blocks' then '/images/linen-room.jpg'
    else '/images/linen-room.jpg'
  end,
  name,
  0,
  true
from public.products;

-- Collection joins
insert into public.collection_products (collection_id, product_id, sort_order) values
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 1),
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 2),
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000006', 3),
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000013', 4),
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000016', 5),
  ('b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003', 1),
  ('b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000008', 2),
  ('b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000009', 3),
  ('b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000011', 4),
  ('b1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 1),
  ('b1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000005', 2),
  ('b1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000014', 3),
  ('b1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000018', 4);

-- No reviews seeded (verified purchases only, moderated before display)
