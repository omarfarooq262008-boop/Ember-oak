# Ember & Oak — Design Tokens

Light theme only. Tokens are defined as CSS variables in `src/index.css` and mapped in Tailwind via `@theme`.

## Colour

| Token        | CSS variable           | Value     | Usage                                      |
|--------------|------------------------|-----------|--------------------------------------------|
| Primary      | `--color-primary`      | `#1C1917` | Deep charcoal — text, primary buttons      |
| Background   | `--color-background`   | `#F7F3EE` | Warm ivory page canvas                     |
| Surface      | `--color-surface`      | `#FFFFFF` | Cards, drawers, alternate sections         |
| Text         | `--color-text`         | `#1C1917` | Body and headings                          |
| Muted        | `--color-muted`        | `#78716C` | Secondary copy, captions                   |
| Accent       | `--color-accent`       | `#A68A5B` | Restrained brass/gold — sparingly          |
| Success      | `--color-success`      | `#3F6F4E` | Stock, confirmation                        |
| Error        | `--color-error`        | `#9B3D3D` | Form errors, destructive                   |
| Border       | `--color-border`       | `#E7E0D8` | 1px rules instead of heavy shadows         |
| Brand band   | `--color-brand-band`   | `#2A2522` | Darker editorial section backgrounds       |

Accent is decorative (underlines, small labels, focus rings on secondary UI). Never flood a page with gold.

## Typography

| Role     | Family            | Weights | Notes                                      |
|----------|-------------------|---------|--------------------------------------------|
| Headings | Sora              | 700, 800 | Tight tracking (`-0.03em` to `-0.04em`)   |
| Body     | Inter             | 400, 500, 600 | Comfortable reading, `font-display: swap` |

No serif fonts. Only these two families; only the weights listed above are loaded.

## Spacing & shape

- **Spacing scale:** 8px base (`--space-1` = 8px through `--space-12` = 96px)
- **Card radius:** 12px (`--radius-card`)
- **Borders:** 1px solid `border` — prefer borders over multi-layer shadows
- **Touch targets:** minimum 44×44px on interactive controls

## Imagery

| Context        | Aspect |
|----------------|--------|
| Product cards  | 4:5    |
| Gallery        | 1:1    |
| Banners / hero | 16:9   |

Warm, cinematic lighting — soft window light, amber undertones. Replace via admin / `product_images`.

## Buttons

One system, three variants, used everywhere:

- **Primary** — charcoal fill, ivory text
- **Secondary** — ivory/white fill, charcoal text, 1px border
- **Ghost** — transparent, charcoal text, subtle hover surface

Min height 44px. Hover and press feedback under 300ms; respect `prefers-reduced-motion`.

## Section rhythm

Alternate backgrounds to separate sections without cards everywhere:

1. Ivory (`background`)
2. White (`surface`)
3. Dark brand band (`brand-band`) for editorial moments
