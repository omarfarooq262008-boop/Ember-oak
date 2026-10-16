-- Server-side catalog list/search for shop + search pages.
-- SECURITY INVOKER so RLS still applies (anon sees only active catalog).

create or replace function public.catalog_list_product_ids(
  p_category_slug text default null,
  p_collection_slug text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_in_stock boolean default null,
  p_size text default null,
  p_scent text default null,
  p_color text default null,
  p_sort text default 'featured',
  p_page int default 1,
  p_page_size int default 12
)
returns table (product_id uuid, total_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_offset int;
  v_cat_id uuid;
  v_col_id uuid;
begin
  p_page := greatest(coalesce(p_page, 1), 1);
  p_page_size := least(greatest(coalesce(p_page_size, 12), 1), 48);
  v_offset := (p_page - 1) * p_page_size;

  if p_category_slug is not null and length(trim(p_category_slug)) > 0 then
    select c.id into v_cat_id
    from public.categories c
    where c.slug = p_category_slug and c.is_active = true
    limit 1;
    if v_cat_id is null then
      return;
    end if;
  end if;

  if p_collection_slug is not null and length(trim(p_collection_slug)) > 0 then
    select c.id into v_col_id
    from public.collections c
    where c.slug = p_collection_slug and c.is_active = true
    limit 1;
    if v_col_id is null then
      return;
    end if;
  end if;

  return query
  with eligible as (
    select
      p.id,
      p.is_featured,
      p.is_bestseller,
      p.name,
      p.created_at,
      min(v.price)::numeric as min_price,
      max(v.price)::numeric as max_price,
      bool_or(v.stock > 0) as has_stock
    from public.products p
    inner join public.product_variants v
      on v.product_id = p.id and v.is_active = true
    where p.is_active = true
      and (v_cat_id is null or p.category_id = v_cat_id)
      and (
        v_col_id is null
        or exists (
          select 1 from public.collection_products cp
          where cp.collection_id = v_col_id and cp.product_id = p.id
        )
      )
      and (
        p_size is null
        or exists (
          select 1 from public.product_variants vv
          where vv.product_id = p.id and vv.is_active = true
            and vv.options->>'size' = p_size
        )
      )
      and (
        p_scent is null
        or exists (
          select 1 from public.product_variants vv
          where vv.product_id = p.id and vv.is_active = true
            and vv.options->>'scent' = p_scent
        )
      )
      and (
        p_color is null
        or exists (
          select 1 from public.product_variants vv
          where vv.product_id = p.id and vv.is_active = true
            and vv.options->>'color' = p_color
        )
      )
    group by p.id, p.is_featured, p.is_bestseller, p.name, p.created_at
    having
      (p_min_price is null or max(v.price) >= p_min_price)
      and (p_max_price is null or min(v.price) <= p_max_price)
      and (p_in_stock is distinct from true or bool_or(v.stock > 0))
  ),
  counted as (
    select count(*)::bigint as cnt from eligible
  ),
  ordered as (
    select e.id
    from eligible e
    order by
      case when p_sort = 'price-asc' then e.min_price end asc nulls last,
      case when p_sort = 'price-desc' then e.min_price end desc nulls last,
      case when p_sort = 'newest' then e.created_at end desc nulls last,
      case when coalesce(p_sort, 'featured') = 'featured' and e.is_featured then 0 else 1 end,
      case when coalesce(p_sort, 'featured') = 'featured' and e.is_bestseller then 0 else 1 end,
      e.name asc
    limit p_page_size
    offset v_offset
  )
  select o.id, c.cnt
  from ordered o
  cross join counted c;
end;
$$;

create or replace function public.catalog_search_product_ids(
  p_query text,
  p_limit int default 24
)
returns table (product_id uuid)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text;
begin
  v_q := trim(coalesce(p_query, ''));
  if length(v_q) = 0 then
    return;
  end if;
  p_limit := least(greatest(coalesce(p_limit, 24), 1), 48);

  return query
  select p.id
  from public.products p
  left join public.categories c on c.id = p.category_id and c.is_active = true
  where p.is_active = true
    and (
      p.name ilike '%' || v_q || '%'
      or coalesce(c.name, '') ilike '%' || v_q || '%'
      or exists (
        select 1 from unnest(p.tags) t where t ilike '%' || v_q || '%'
      )
    )
  order by
    case when p.name ilike v_q || '%' then 0 else 1 end,
    p.is_bestseller desc,
    p.name asc
  limit p_limit;
end;
$$;

grant execute on function public.catalog_list_product_ids(
  text, text, numeric, numeric, boolean, text, text, text, text, int, int
) to anon, authenticated;

grant execute on function public.catalog_search_product_ids(text, int)
  to anon, authenticated;
