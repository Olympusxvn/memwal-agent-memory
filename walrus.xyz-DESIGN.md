# Design System Inspired by Walrus

## 1. Visual Theme & Atmosphere

Walrus embodies a premium, tech-forward aesthetic rooted in dark sophistication with vibrant neon accents. The design language emphasizes minimal, purposeful interfaces layered over immersive gradient backgrounds—featuring cyan, purple, and deep blue tones that evoke cutting-edge technology and trustworthiness. The visual identity balances stark black backgrounds with warm off-white typography and electric accent colors, creating a sense of precision and innovation. Bold, oversized typography dominates key messaging, while refined spacing and subtle borders maintain clarity. The overall mood is confident, forward-thinking, and optimized for developers building the future of verifiable data infrastructure.

**Key Characteristics**
- Dark-first, immersive gradient backgrounds with neon accent lighting
- Large-scale typography with generous whitespace for emphasis
- Minimal UI components with high contrast and clean borders
- Premium feel through selective use of electric purples and teals
- Tech-forward aesthetic targeting developer and enterprise audiences
- Gradient overlays and soft glows enhancing depth and modernity

## 2. Color Palette & Roles

### Primary
- **Brand Purple** (`#613DFF`): Primary action buttons, accent highlights, key UI elements; establishes brand identity across interactive components
- **Light Purple** (`#CAB1FF`): Secondary purple accents, hover states, and subtle background tints for hierarchy

### Accent Colors
- **Electric Cyan** (`#98EFE4`): Vibrant accent for highlights, interactive states, and gradient components
- **Bright Cyan** (`#83EFE1`): Alternative cyan for depth variations and glowing effects
- **Soft Blue** (`#A1C8FF`): Light blue accents for secondary interactive elements and borders
- **Bright Blue** (`#007AFF`): System blue for alternative CTAs and specialized interactions

### Interactive
- **Ghost Button Border** (`#FAF8F5` at 10% opacity): Subtle outline on transparent button states
- **Link Text** (`#FAF8F5`): Primary text for navigation links and interactive elements
- **Hover Text** (`#FFFFFF`): Enhanced visibility on hover or active states

### Neutral Scale
- **Off-White** (`#FAF8F5`): Primary text color, body copy, and light UI elements; warm, readable background alternative
- **Pure Black** (`#000000`): Primary background, deep shadows, and maximum contrast text
- **Dark Charcoal** (`#2B2D31`): Secondary dark background, subtle distinction from pure black
- **Medium Dark** (`#1C2228`): Tertiary dark background for nested sections
- **Warm Gray** (`#222222`): Dark text on light backgrounds, secondary body copy
- **Medium Gray** (`#53575A`): Tertiary text, disabled states, and secondary information
- **Light Gray** (`#8E9294`): Placeholder text, hints, and lower-priority information
- **Border Gray** (`#B0B4B6`): Subtle dividers and container outlines
- **Separator** (`#DADAD6`): Light border color for cards and section dividers

### Surface & Borders
- **Card Background**: Transparent with `1px solid #F3F2F2` borders for clarity on dark backgrounds
- **Container Background**: `rgba(0, 0, 0, 0)` (transparent) for layered depth effects
- **Navigation Surface**: Transparent with light text on dark base

## 3. Typography Rules

### Font Family
**Primary:** Ratch (fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
**Secondary:** Ratch (same stack for consistency)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / Hero | Ratch | 144px | 500 | 115.2px | Normal | Main hero headlines, page titles |
| Large Display | Ratch | 96px | 450 | 91.2px | Normal | Large section headers, prominent statements |
| Heading / H3 | Ratch | 56px | 450 | 53.2px | Normal | Section subheadings, feature titles |
| Body / Paragraph | Ratch | 18px | 500 | 25.2px | Normal | Main body copy, card descriptions |
| Navigation | Ratch | 16px | 400 | 24px | Normal | Menu items, navigation links |
| Label / Caption | Ratch | 14px | 400 | 16.94px | Normal | Form labels, helper text, captions |
| H2 / Subtitle | Ratch | 16px | 400 | 24px | Normal | Secondary headings, subheadings |

### Principles
- **Hierarchy through scale:** Size differences create clear information priority; hero text dominates at 144px, body text sits at 18px
- **Weight restraint:** Minimal weight variation (400–500) prevents visual noise while maintaining readability
- **Generous line height:** 1.5–1.6× multiplier ensures comfort on dark backgrounds with high contrast
- **Single typeface:** Ratch throughout creates cohesion and reduces decision fatigue for developers
- **Purpose-driven sizing:** Each size serves a specific content tier; no arbitrary intermediates

## 4. Component Stylings

### Buttons

**Primary Button (Hero CTA)**
- `background-color`: `rgba(0, 0, 0, 0)` (transparent)
- `color`: `#FAF8F5`
- `font-size`: `18px`
- `font-weight`: `500`
- `font-family`: Ratch
- `padding`: `10px 20px`
- `border-radius`: `26px`
- `border`: `2px solid rgba(250, 248, 245, 0.1)`
- `line-height`: `25.2px`
- **Hover state:** `border-color: rgba(250, 248, 245, 0.3)`, `color: #FFFFFF`
- **Active state:** `border-color: rgba(250, 248, 245, 0.5)`

**Secondary Button (Alternative CTA)**
- `background-color`: `rgba(0, 0, 0, 0)`
- `color`: `#FAF8F5`
- `font-size`: `18px`
- `font-weight`: `370`
- `font-family`: Ratch
- `padding`: `10px 20px`
- `border-radius`: `26px`
- `border`: `2px solid rgba(250, 248, 245, 0.1)`
- `line-height`: `27px`
- **Hover state:** Increase `border-color` opacity to `0.25`
- **Disabled state:** `opacity: 0.5`, `pointer-events: none`

**Ghost Button (Minimal, Text-Only)**
- `background-color`: `rgba(0, 0, 0, 0)`
- `color`: `#FAF8F5`
- `font-size`: `96px`
- `font-weight`: `450`
- `font-family`: Ratch
- `padding`: `8px 0px`
- `border-radius`: `0px`
- `border`: none
- `line-height`: `91.2px`
- **Hover state:** `color: #FFFFFF`, `text-decoration: underline`

### Cards & Containers

**Card with Border**
- `background-color`: `rgba(0, 0, 0, 0)`
- `color`: `#222222`
- `font-size`: `14px`
- `font-weight`: `400`
- `font-family`: Ratch
- `padding`: `0px`
- `border-radius`: `0px`
- `border`: `1px solid #F3F2F2`
- `line-height`: `16.94px`
- **Hover state:** `border-color: #DADAD6`, `background-color: rgba(250, 248, 245, 0.02)`

**Card with Padding**
- `background-color`: `rgba(0, 0, 0, 0)`
- `color`: `#222222`
- `font-size`: `14px`
- `font-weight`: `400`
- `font-family`: Ratch
- `padding`: `12px 16px`
- `border-radius`: `0px`
- `border`: none
- `line-height`: `16.94px`

**Container (Nested)**
- `background-color`: `rgba(0, 0, 0, 0)`
- `color`: `#222222`
- `padding`: `24px` to `64px` (context-dependent)
- `border-radius`: `0px` to `48px` (for image containers)
- `border`: varies based on nesting level

### Inputs & Forms

**Text Input**
- `background-color`: `#FFFFFF`
- `color`: `#222222`
- `font-size`: `16px`
- `font-weight`: `400`
- `font-family`: Ratch
- `padding`: `12px 16px`
- `border-radius`: `4px`
- `border`: `1px solid #B0B4B6`
- `line-height`: `24px`
- **Focus state:** `border-color: #613DFF`, `box-shadow: 0 0 0 3px rgba(97, 61, 255, 0.1)`
- **Disabled state:** `background-color: #F3F2F2`, `color: #8E9294`, `cursor: not-allowed`

**Form Label**
- `color`: `#222222`
- `font-size`: `14px`
- `font-weight`: `400`
- `font-family`: Ratch
- `line-height`: `16.94px`
- `margin-bottom`: `8px`

**Checkbox / Radio**
- `width`: `20px`
- `height`: `20px`
- `border-radius`: `3px` (checkbox) or `50%` (radio)
- `border`: `2px solid #613DFF`
- **Checked state:** `background-color: #613DFF`, `border-color: #613DFF`

### Navigation

**Navigation Bar**
- `background-color`: `rgba(0, 0, 0, 0.95)` (semi-transparent)
- `color`: `#FAF8F5`
- `font-size`: `16px`
- `font-weight`: `400`
- `font-family`: Ratch
- `padding`: `24px 0px`
- `border-radius`: `0px`
- `border`: none
- `line-height`: `24px`
- **Link hover state:** `color: #FFFFFF`, `text-decoration: underline`

**Menu Item (Dropdown)**
- `background-color`: `transparent`
- `color`: `#FAF8F5`
- `padding`: `12px 16px`
- `border-radius`: `0px`
- `border`: none
- **Hover state:** `background-color: rgba(97, 61, 255, 0.1)`, `color: #FFFFFF`
- **Active state:** `color: #613DFF`, `border-bottom: 2px solid #613DFF`

### Links

**Default Link**
- `background-color`: `transparent`
- `color`: `#FAF8F5`
- `font-size`: `16px`
- `font-weight`: `400`
- `font-family`: Ratch
- `padding`: `0px`
- `border-radius`: `0px`
- `border`: none
- `line-height`: `24px`
- `text-decoration`: none
- **Hover state:** `color: #FFFFFF`, `text-decoration: underline`
- **Visited state:** `color: #CAB1FF`

**CTA Link (Arrow Style)**
- `color`: `#FAF8F5`
- `font-size`: `16px`
- **Hover state:** `color: #98EFE4`, add right arrow animation

## 5. Layout Principles

### Spacing System
**Base unit:** `8px`

**Scale:**
- `8px`: Micro spacing (inline element gaps, tight padding)
- `12px`: Compact spacing (button padding, form field margins)
- `16px`: Standard spacing (card padding, section gaps)
- `20px`: Medium gap (component spacing)
- `24px`: Large padding (section headers, containers)
- `32px`: Section gap (between major sections)
- `40px`: Large gap (feature spacing)
- `48px`: Extra-large padding (hero sections, feature blocks)
- `56px`: Massive spacing (section breaks)
- `64px`: Hero padding (full-width sections)
- `72px` and `80px`: Page-level margins (top/bottom spacing, hero margins)

**Usage context:**
- Buttons and inline elements: `8px–12px`
- Cards and containers: `16px–24px`
- Between sections: `32px–56px`
- Page margins: `64px–80px`

### Grid & Container
- **Max-width container:** `1440px` (full-width on smaller screens)
- **Column strategy:** 12-column flexible grid; Walrus uses full-width sections with responsive collapse
- **Horizontal padding:** `64px` on desktop, `24px` on tablet, `16px` on mobile
- **Section patterns:** Full-width hero, centered content containers, asymmetrical feature layouts

### Whitespace Philosophy
Walrus embraces aggressive whitespace to communicate premium positioning and reduce cognitive load. Large gaps between sections create visual breathing room and emphasize content hierarchy. Empty space is treated as a design element, not wasted real estate. Content is centered or left-aligned with significant margins, allowing the eye to focus. Backgrounds (dark/gradient overlays) fill negative space rather than content, creating layered depth.

### Border Radius Scale
- `0px`: Cards, container edges, standard UI elements (default)
- `3px`: Modal borders, tight corners
- `4px`: Input fields, subtle rounding
- `5px`: Alternative modals, button alternatives
- `26px`: Primary buttons, pill-shaped CTAs
- `48px`: Image containers, large element rounding

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| **Flat (0)** | No shadow, transparent background | Base UI, typography, links |
| **Raised (1)** | `rgba(0, 0, 0, 0.1) 0px 4px 6px -4px` | Cards on hover, subtle lift |
| **Lifted (2)** | `rgba(0, 0, 0, 0.1) 0px 10px 15px -3px` | Dropdowns, floating components |
| **Elevated (3)** | `rgba(80, 80, 80, 0.12) 0px 9px 46px 8px, rgba(80, 80, 80, 0.14) 0px 24px 38px 3px, rgba(80, 80, 80, 0.2) 0px 11px 15px -7px` | Modals, overlay containers |
| **Deep (4)** | `rgb(0, 0, 0) 0px 0px 24px -5px` | Hero imagery, backdrop glows |

**Shadow Philosophy:**
Walrus uses selective, soft shadows to create layering without visual heaviness. Shadows are subtle on light elements but pronounced on dark backgrounds where depth is critical. The system avoids hard shadows in favor of soft, color-accurate drop shadows that enhance the premium, tech-forward feel. Glowing effects (negative space shadows) create neon accents around hero imagery and key CTAs.

## 7. Do's and Don'ts

### Do
- Use `#613DFF` (Brand Purple) for all primary CTAs and attention-grabbing elements
- Maintain high contrast between text and background; ensure WCAG AA compliance (min 4.5:1 ratio)
- Apply generous padding (`24px–64px`) to sections to create visual hierarchy and breathing room
- Use the full Ratch typeface family; avoid substitutions or weight variations outside the defined hierarchy
- Implement transparent backgrounds (`rgba(0, 0, 0, 0)`) on buttons for the minimal, tech-forward aesthetic
- Layer gradient overlays (blue-to-cyan) over dark backgrounds for immersive sections
- Use `#98EFE4` (Electric Cyan) for accent highlights and interactive feedback
- Keep borders minimal (`1px solid`) and rely on whitespace and typography for separation
- Scale typography aggressively on hero sections; use 96px–144px for key messaging
- Apply border-radius consistently: `0px` for standard UI, `26px` for buttons, `48px` for imagery

### Don't
- Mix shadows; stick to the defined elevation levels
- Use colors outside the extracted palette without strong rationale
- Add unnecessary button borders on dark backgrounds; rely on subtle opacity (`rgba(..., 0.1)`)
- Override font-weight values outside the 370–500 range for body copy
- Create interactive elements with high-saturation colors not in the palette
- Add padding that exceeds `64px` without strong visual intention
- Use serif typefaces or replace Ratch without design lead approval
- Layer multiple text decorations (underline + bold) simultaneously
- Create dark text on dark backgrounds; always ensure readable contrast
- Apply box-shadows to elements without clear elevation purpose

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| **Mobile** | `320px–640px` | Single-column layouts, `16px` horizontal padding, `96px` hero text, `24px` section gaps |
| **Tablet** | `641px–1024px` | Two-column grids, `24px` padding, `56px` hero text, `32px` section gaps |
| **Desktop** | `1025px–1440px` | Full 12-column grid, `64px` padding, `144px` hero text, `48px–56px` section gaps |
| **Ultra-wide** | `1441px+` | Constrain max-width to `1440px`, add side gutters with background color |

### Touch Targets
- **Minimum size:** `44px × 44px` for all interactive elements (buttons, links, form controls)
- **Spacing between targets:** Min `8px` to prevent mis-taps
- **Button padding:** Increase to `12px 24px` on mobile for easier interaction
- **Form fields:** Min height `44px`, padding `12px 16px`, font-size `16px` (prevents iOS zoom)
- **Navigation items:** Min `48px` height with `16px` vertical padding

### Collapsing Strategy
- **Hero section:** Text scale down from `144px` → `96px` (tablet) → `56px` (mobile); maintain line-height ratio
- **Navigation:** Collapse to hamburger menu below `640px`; use fixed bottom navigation or slide-out drawer
- **Multi-column layouts:** Stack to single column below `1024px`; maintain full width on mobile
- **Card grids:** 3 columns (desktop) → 2 columns (tablet) → 1 column (mobile)
- **Images & heroes:** Scale to full viewport width on mobile; maintain aspect ratio
- **Spacing:** Reduce `64px` margins to `40px` (tablet), `24px` (mobile) while maintaining visual hierarchy
- **Button sizing:** Increase padding and width on mobile to fill horizontal space where appropriate

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Brand Purple (`#613DFF`)
- **Background (Dark):** Pure Black (`#000000`)
- **Background (Secondary):** Dark Charcoal (`#2B2D31`)
- **Heading text:** Off-White (`#FAF8F5`)
- **Body text:** Off-White (`#FAF8F5`)
- **Accent highlight:** Electric Cyan (`#98EFE4`)
- **Secondary accent:** Light Purple (`#CAB1FF`)
- **Borders & dividers:** Separator (`#DADAD6`)
- **Disabled / tertiary:** Light Gray (`#8E9294`)
- **Ghost button border:** Off-White at 10% opacity (`rgba(250, 248, 245, 0.1)`)

### Iteration Guide
1. **All primary buttons use transparent backgrounds with 2px off-white borders** at `rgba(250, 248, 245, 0.1)` opacity; no filled backgrounds except hover states
2. **Hero text starts at 144px** (Ratch, weight 500) on desktop, scales down proportionally on smaller screens; never smaller than 56px on mobile
3. **Apply 64px padding** to hero and feature sections on desktop; reduce to 40px on tablet and 24px on mobile
4. **Electric Cyan (`#98EFE4`) is the only accent color** for interactive feedback, hover states, and glowing elements; do not mix with Brand Purple
5. **All text on dark backgrounds must be Off-White (`#FAF8F5`)** for consistency; do not use pure white (`#FFFFFF`) for body copy
6. **Cards use transparent backgrounds with 1px light gray borders** (`#F3F2F2`); no box shadows on cards unless elevation level 2+ is explicitly required
7. **Navigation links and CTAs use no text-decoration by default**; add underline only on hover or active state
8. **Form fields on dark backgrounds** use white backgrounds (`#FFFFFF`) with dark text (`#222222`) for contrast; maintain 44px minimum height
9. **Section spacing follows the 8px scale**: 24px for small sections, 48px for medium, 64px–80px for major page breaks
10. **Border radius is 0px by default** for most UI elements; use 26px exclusively for buttons, 4px for inputs, 48px only for images