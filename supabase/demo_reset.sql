-- =============================================================================
-- Ember & Oak — DEMO RESET (run manually)
-- =============================================================================
-- What this deletes (transactional; roll back with ROLLBACK if anything looks wrong):
--   • All orders, order_items, payments, webhook_events
--   • All email_outbox rows
--   • All contact_messages
--   • All newsletter_subscribers
--   • All app_events
--   • All stock_history (so inventory history matches reset stock)
--
-- What this keeps:
--   • products, product_images, product_variants (stock reset to seed values)
--   • categories, collections, collection_products
--   • discount_codes, settings
--   • All user accounts (auth.users + profiles), addresses, wishlists, reviews
--
-- Also remaps any hotlinked / non-local product, category, or collection image
-- URLs back to project-hosted `/images/*.jpg` paths from the seed map.
--
-- How to run (Supabase SQL Editor or psql):
--   1. Open this file
--   2. Execute the whole script (BEGIN … COMMIT)
--   3. Confirm row counts look sane, then COMMIT (already at end) or re-run
--      after fixing if you used an interactive transaction client
-- =============================================================================

begin;

-- --- Commerce / ops noise from testing ---------------------------------------
delete from public.webhook_events;
delete from public.payments;
delete from public.order_items;
delete from public.orders;
delete from public.email_outbox;
delete from public.contact_messages;
delete from public.newsletter_subscribers;
delete from public.app_events;
delete from public.stock_history;

-- --- Reset variant stock to seed values (by SKU) -----------------------------
update public.product_variants v
set stock = s.stock
from (
  values
    ('CND-SE-220', 28),
    ('CND-SE-450', 12),
    ('CND-BC-220', 34),
    ('CND-BC-450', 8),
    ('CND-FL-220', 22),
    ('CND-FL-450', 3),
    ('CND-OT-220', 18),
    ('CND-OT-450', 6),
    ('CND-WT-220', 40),
    ('DIF-AM-200', 25),
    ('DIF-AM-REF', 15),
    ('DIF-CG-200', 20),
    ('DIF-ST-AMB', 14),
    ('DIF-ST-FIG', 9),
    ('DIF-ST-OUT', 0),
    ('CER-MB-ASH', 11),
    ('CER-MB-CLY', 7),
    ('CER-MB-IVO', 16),
    ('CER-TH-RAW', 19),
    ('CER-TH-BLK', 2),
    ('CER-IT-SPK', 30),
    ('CER-CV-IVO', 13),
    ('CER-CV-SND', 5),
    ('THR-CW-CAM', 10),
    ('THR-CW-CHR', 8),
    ('THR-LN-IVO', 17),
    ('THR-LN-SAG', 4),
    ('THR-RB-OAT', 21),
    ('THR-RB-SLATE', 0),
    ('SET-ER-01', 15),
    ('SET-HT-01', 7),
    ('SET-QB-01', 9),
    ('CND-TT-03', 32),
    ('SPR-LN-100', 45),
    ('ACC-MJ-01', 50),
    ('ACC-MJ-REF', 80),
    ('ACC-SN-01', 27),
    ('ACC-OS-60', 6),
    ('ACC-OS-90', 3),
    ('ACC-CB-04', 60)
) as s(sku, stock)
where v.sku = s.sku;

-- --- Ensure catalog images are project-hosted (not hotlinked) ----------------
update public.categories set image_url = c.path
from (
  values
    ('candles', '/images/candle-warm.jpg'),
    ('diffusers', '/images/diffuser.jpg'),
    ('ceramics', '/images/ceramic-bowl.jpg'),
    ('throws', '/images/throw-texture.jpg'),
    ('gift-sets', '/images/gift-wrap.jpg')
) as c(slug, path)
where categories.slug = c.slug;

update public.collections set image_url = c.path
from (
  values
    ('amber-hours', '/images/collection-amber.jpg'),
    ('clay-studio', '/images/collection-clay.jpg'),
    ('linen-light', '/images/collection-linen.jpg')
) as c(slug, path)
where collections.slug = c.slug;

-- Primary images for seeded products
update public.product_images pi
set url = mapped.path
from public.products p
join (
  values
    ('sandalwood-ember-candle', '/images/candle-warm.jpg'),
    ('bergamot-cedar-candle', '/images/candle-lit.jpg'),
    ('fig-leaf-candle', '/images/candle-soft.jpg'),
    ('oud-tobacco-candle', '/images/candle-dark.jpg'),
    ('white-tea-candle', '/images/candle-soft.jpg'),
    ('reed-diffuser-amber', '/images/diffuser.jpg'),
    ('reed-diffuser-citrus-grove', '/images/diffuser.jpg'),
    ('ceramic-diffuser-stone', '/images/ceramic-studio.jpg'),
    ('matte-bowl-large', '/images/ceramic-bowl.jpg'),
    ('candle-holder-pair', '/images/candle-lit.jpg'),
    ('incense-tray', '/images/ceramic-studio.jpg'),
    ('vase-column', '/images/vase-column.jpg'),
    ('wool-throw-camel', '/images/throw-texture.jpg'),
    ('linen-throw-ivory', '/images/linen-room.jpg'),
    ('knit-bolster', '/images/throw-texture.jpg'),
    ('evening-ritual-set', '/images/gift-wrap.jpg'),
    ('host-table-set', '/images/gift-wrap.jpg'),
    ('quiet-bedroom-set', '/images/linen-room.jpg'),
    ('travel-tin-trio', '/images/candle-lit.jpg'),
    ('room-spray-linen', '/images/diffuser.jpg'),
    ('match-jar-brass', '/images/candle-warm.jpg'),
    ('snuffer-bell', '/images/candle-dark.jpg'),
    ('wall-shelf-oak', '/images/ceramic-studio.jpg'),
    ('cedar-blocks', '/images/linen-room.jpg')
) as mapped(slug, path) on mapped.slug = p.slug
where pi.product_id = p.id
  and pi.is_primary = true;

-- Any remaining hotlinked / non-local product images (QA extras, secondaries)
update public.product_images
set url = '/images/linen-room.jpg'
where url like 'http%'
   or url not like '/images/%';

update public.categories
set image_url = '/images/candle-warm.jpg'
where image_url is null
   or image_url like 'http%'
   or image_url not like '/images/%';

update public.collections
set image_url = '/images/collection-amber.jpg'
where image_url is null
   or image_url like 'http%'
   or image_url not like '/images/%';

commit;
