-- Fix demo catalog image URLs to local storefront assets (public/images/).
-- Safe to run twice (idempotent UPDATEs keyed by slug).
-- Paths are root-relative so the browser loads them from your deployed site.

begin;

-- Categories
update public.categories set image_url = '/images/candle-warm.jpg' where slug = 'candles';
update public.categories set image_url = '/images/diffuser.jpg' where slug = 'diffusers';
update public.categories set image_url = '/images/ceramic-bowl.jpg' where slug = 'ceramics';
update public.categories set image_url = '/images/throw-texture.jpg' where slug = 'throws';
update public.categories set image_url = '/images/gift-wrap.jpg' where slug = 'gift-sets';

-- Collections
update public.collections set image_url = '/images/collection-amber.jpg' where slug = 'amber-hours';
update public.collections set image_url = '/images/collection-clay.jpg' where slug = 'clay-studio';
update public.collections set image_url = '/images/collection-linen.jpg' where slug = 'linen-light';

-- Product primary images (by product slug)
update public.product_images pi
set url = v.url
from (
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
) as v(slug, url)
join public.products p on p.slug = v.slug
where pi.product_id = p.id
  and pi.is_primary = true;

-- Any remaining non-primary rows that still hotlink Unsplash
update public.product_images pi
set url = '/images/linen-room.jpg'
from public.products p
where pi.product_id = p.id
  and pi.url like '%images.unsplash.com%';

update public.categories
set image_url = '/images/candle-warm.jpg'
where image_url like '%images.unsplash.com%';

update public.collections
set image_url = '/images/collection-linen.jpg'
where image_url like '%images.unsplash.com%';

commit;
