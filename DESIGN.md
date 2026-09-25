---
name: KnowThyNeighbor
description: A neighborhood social dining app that connects couples for shared meals
colors:
  cork-board: "#C4A366"
  cork-shadow: "#A8893F"
  cork-highlight: "#D4B882"
  warm-cream: "#FDF8ED"
  aged-paper: "#F0E8D5"
  pushpin-red: "#CC4433"
  pushpin-red-deep: "#B83A2C"
  ink-blue: "#2B4570"
  faded-ink: "#3D5A8A"
  thumbtack-green: "#5B7F5E"
  index-card-yellow: "#F5E6A3"
typography:
  display:
    fontFamily: "Permanent Marker, cursive"
    fontSize: "clamp(2.2rem, 5vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Permanent Marker, cursive"
    fontSize: "clamp(1.4rem, 3vw, 2.4rem)"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.04em"
  subtitle:
    fontFamily: "Caveat, cursive"
    fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Source Sans 3, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.03em"
rounded:
  none: "0"
  chip: "2px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "28px"
  xl: "36px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.pushpin-red}"
    textColor: "{colors.warm-cream}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "14px 48px"
  button-primary-hover:
    backgroundColor: "{colors.pushpin-red-deep}"
  card-paper:
    backgroundColor: "{colors.warm-cream}"
    rounded: "{rounded.none}"
    padding: "28px 24px"
  chip-host:
    backgroundColor: "{colors.pushpin-red}"
    textColor: "{colors.warm-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  chip-visitor:
    backgroundColor: "{colors.thumbtack-green}"
    textColor: "{colors.warm-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.none}"
    padding: "10px 0"
---

# Design System: KnowThyNeighbor

## Overview

**Creative North Star: "The Neighborhood Board"**

KnowThyNeighbor's visual identity is a cork bulletin board in a neighborhood coffee shop. Every surface in the app — from the landing page to discovery to chat — lives on this board. Cards are cream paper pinned with colored pushpins. Text alternates between marker-drawn headlines, handwritten notes, and printed body copy. The board has weight, grain, and warm lighting. It is not a metaphor layered onto a digital interface; the interface IS the board.

The system rejects two categories entirely: tech/startup aesthetics (gradients, glassmorphism, dark mode, neon accents, SaaS dashboard patterns) and social media patterns (infinite scroll feeds, like buttons, algorithmic sorting cues, engagement bait). KnowThyNeighbor gets people off the screen and around a table. The design must feel like the neighborhood, not like the internet.

**Key Characteristics:**
- Physical materiality: cork, paper, ink, pins — not pixels, containers, and cards
- Handmade and direct: controls feel like tearing a tab off a flyer, not clicking a digital button
- Warm and analog: earth tones, imperfect rotations, handwriting fonts
- One continuous board: every screen is the same corkboard, not separate "pages"
- Deliberate imperfection: slight card rotations (0.5–2.3°) communicate that real hands pinned these

## Colors

The palette is drawn from the physical materials on the board — cork, cream paper, ink, and colored pins. No digital-native colors. Every hue could exist on a real bulletin board.

### Primary
- **Pushpin Red** (#CC4433): The primary action color. Used for CTAs, primary buttons, host badges, error states, and the most prominent pushpins. Its deep variant (#B83A2C) appears on hover.

### Secondary
- **Thumbtack Green** (#5B7F5E): Secondary accent for positive states, visitor badges, availability markers, and secondary pushpins. A muted, earthy green — not mint, not emerald.

### Tertiary
- **Index Card Yellow** (#F5E6A3): Accent surface for callouts, handwritten notes, and highlighted information. The color of a real index card, not a neon post-it.

### Neutral
- **Warm Cream** (#FDF8ED): The paper surface. Every card, form, and content container uses this as its background. Not white — warm and slightly yellow, like real paper.
- **Aged Paper** (#F0E8D5): A slightly darker cream for secondary surfaces, inactive states, and backgrounds within cards (calendar slots, empty fields).
- **Ink Blue** (#2B4570): The primary text color. Deep navy-blue like ballpoint pen ink on paper. Used for all headings, body copy, and primary text.
- **Faded Ink** (#3D5A8A): Secondary text, placeholders, and meta information. Like ink that's been sitting on the board for a while.
- **Cork Board** (#C4A366): The board surface itself. Full-bleed background on every screen.
- **Cork Shadow** (#A8893F): Darker cork for texture grain, scrollbar tracks, and CTA borders.
- **Cork Highlight** (#D4B882): Lighter cork for scrollbar thumbs, input underlines at rest, and subtle surface variation.

### Named Rules
**The No White Rule.** No element uses pure white (#FFFFFF) or pure black (#000000). The warmest neutral is Warm Cream (#FDF8ED); the darkest is Ink Blue (#2B4570). Purity does not exist on a real bulletin board.

**The Material Color Rule.** Every color in the system corresponds to a physical material: cork, paper, ink, pins. If a color doesn't belong on a real bulletin board, it doesn't belong in the app.

## Typography

**Display Font:** Permanent Marker (with cursive fallback)
**Handwriting Font:** Caveat (with cursive fallback)
**Title/Label Font:** Barlow Condensed (with sans-serif fallback)
**Body Font:** Source Sans 3 (with Georgia, serif fallback)

**Character:** Four fonts, four hands. Permanent Marker is the person who drew the main flyer in bold strokes. Caveat is the neighbor who scribbled a note and pinned it up. Barlow Condensed is the label maker — functional, uppercase, printed small. Source Sans 3 is the printed paragraph, readable and steady. Together they create a board written by multiple people, not a single typographic voice.

### Hierarchy
- **Display** (Permanent Marker 400, clamp(2.2rem, 5vw, 3.4rem), line-height 1.1, tracking -0.02em): The main flyer headline. Used once per screen for the dominant title.
- **Headline** (Permanent Marker 400, clamp(1.4rem, 3vw, 2.4rem), line-height 1.2): Section headers and card titles on the board. Marker-drawn but smaller than display.
- **Subtitle** (Caveat 400, clamp(1.2rem, 2.5vw, 1.6rem), line-height 1.4): Handwritten supporting text beneath headlines. Descriptions, notes, friendly context.
- **Title** (Barlow Condensed 700, 1.1rem, line-height 1.3, tracking 0.04em, uppercase): Card names, section labels, button text. The label maker voice — compact, bold, functional.
- **Body** (Source Sans 3 400, 1rem, line-height 1.7, max 55ch): Printed explanatory text. Readable paragraphs that carry information without personality.
- **Label** (Barlow Condensed 600, 0.75rem, line-height 1.3, tracking 0.03em, uppercase): Tags, chips, metadata, calendar labels. Small and precise.

### Named Rules
**The Four Hands Rule.** Every text element is assigned to one of four typefaces based on who would have written it on the board. Marker for bold announcements, Caveat for personal notes, Barlow Condensed for labels and actions, Source Sans for printed information. Never mix voices within a single text block.

**The Uppercase Label Rule.** Barlow Condensed is always uppercase with tracked letter-spacing. It represents machine-printed labels and stamps. Never set it in sentence case.

## Layout

The board is a single continuous surface. All content sits within a 1100px max-width container centered on the cork background. No header bar, no sidebar, no traditional page scaffolding — just pinned objects on a board.

Cards are positioned with slight rotation (0.5° to 2.3°, alternating positive/negative) and never align to a perfect grid. Two-column layouts at desktop collapse to single-column on mobile. Sections are separated by generous vertical space (80px between sections) with no dividers or horizontal rules — the cork between the cards is the separator.

**Spacing rhythm:** Internal card padding uses 20–36px. Gaps between sibling cards use 24px. The board's own padding is 40px horizontal, 16px side gutter.

**Breakpoints:**
- Desktop: 2-column grid, 1100px max-width, full card rotation
- Tablet (≤768px): single column, reduced rotation (half the desktop values)
- Phone (≤480px): single column, minimal rotation, tighter padding (24px cards)

## Elevation & Depth

Depth is physical and structural — it simulates the real physics of paper pinned to cork. Every shadow in the system answers the question: "How far is this piece of paper from the board?"

### Shadow Vocabulary
- **Resting card** (`2px 3px 8px rgba(60, 40, 20, 0.18), 0 1px 2px rgba(60, 40, 20, 0.1)`): Paper lying flat on the board with a slight curl. The default state for every card.
- **Lifted card** (`3px 6px 16px rgba(60, 40, 20, 0.18), 0 2px 4px rgba(60, 40, 20, 0.12)`): Paper pulled slightly toward the viewer on hover. Increased offset and blur signal physical lift.
- **Pushpin** (`0 2px 4px rgba(60, 40, 20, 0.35), inset 0 -2px 3px rgba(0, 0, 0, 0.15), inset 0 2px 3px rgba(255, 255, 255, 0.3)`): A spherical pin casting a tight shadow with internal specular highlight. The most complex shadow in the system because it simulates a 3D object, not a flat surface.

### Named Rules
**The Paper Physics Rule.** Shadows only exist because paper sits on cork. No ambient glow, no colored shadows, no decorative halos. If the element is not a piece of paper or a pin, it does not cast a shadow.

## Shapes

The form language is paper — rectangular, sharp-cornered, imperfect. No border-radius on cards, buttons, or containers. The only rounded elements are pushpins (circles, 50% radius) and tag/chip backgrounds (2px radius, like the slight rounding on a real label-maker strip).

Cards never have visible borders. Their edges are defined by the shadow they cast on the cork. Buttons are flat rectangles — no rounded corners, no outlines, no pill shapes.

**Rotation** is a core shape primitive. Every card carries a CSS rotation between -2.3° and +2.3°, assigned per card to create the look of items pinned at different angles. Hover reduces the visual "askew" by lifting the card rather than straightening it.

### Named Rules
**The Sharp Paper Rule.** border-radius is 0 on cards, buttons, inputs, and containers. Paper has corners. The only exceptions are pushpins (circular) and printed labels (2px, simulating label-maker tape).

## Components

### Buttons
- **Shape:** Sharp rectangle, no border-radius (0px)
- **Primary (Pushpin Red CTA):** Pushpin Red (#CC4433) background, Warm Cream (#FDF8ED) text, Barlow Condensed 700 uppercase, letter-spacing 0.04em, padding 14px 48px. No border.
- **Hover:** Background darkens to Pushpin Red Deep (#B83A2C), scale(1.03) transform. Transition: background 0.15s ease, transform 0.15s ease.
- **Focus:** 3px solid Pushpin Red outline with 2px offset.
- **Disabled:** 70% opacity, no hover effect.

### Pushpins
The signature component. 20px circles with a radial gradient simulating a 3D sphere (highlight at 35% 35%). Three color variants:
- **Red pin** (radial-gradient from #e85545 through #CC4433 to #993322): centered on card, primary accent
- **Green tack** (radial-gradient from #7aa87d through #5B7F5E to #4a6a4d): offset right, secondary accent
- **Blue pin** (radial-gradient from #4a6a9a through #2B4570 to #1a3050): offset left, tertiary accent

Positioned absolutely at top: -8px, casting the pin shadow. Every card has exactly one pin.

### Cards / Containers
- **Corner Style:** Sharp (0px radius)
- **Background:** Warm Cream (#FDF8ED). Index cards use Index Card Yellow (#F5E6A3).
- **Shadow:** Resting card shadow. Lifts to elevated shadow on hover.
- **Border:** None. Edge defined by shadow contrast against cork.
- **Internal Padding:** 28px 24px (standard), 48px 36px (hero/main flyer), 20px (compact)
- **Rotation:** Each card carries a unique rotation (-2.3° to +2.3°). Hover adds translateY(-4px) scale(1.01) on top of the existing rotation.

### Chips / Tags
- **Host:** Pushpin Red background, Warm Cream text, Barlow Condensed 600, 0.75rem uppercase, 4px 10px padding, 2px radius
- **Visitor:** Thumbtack Green background, same text treatment

### Inputs / Fields
- **Style:** Transparent background on paper. Bottom border only (2px solid Cork Highlight at rest).
- **Label:** Caveat handwriting, 1rem, Faded Ink color, positioned above the field.
- **Placeholder:** Caveat handwriting, 40% opacity Faded Ink.
- **Focus:** Bottom border transitions to Ink Blue, thickens to 3px. No outline ring (overrides global focus-visible).
- **Error:** Bottom border turns Pushpin Red. Error message in Caveat, 0.85rem, Pushpin Red.

### Navigation
Not yet implemented. When built, navigation should feel like section dividers on the board — tabs of paper sticking up, or labeled pushpins — not a traditional nav bar or sidebar.

## Do's and Don'ts

### Do:
- **Do** use CSS custom properties from globals.css (`--cork`, `--paper`, `--pushpin-red`, `--ink-blue`, etc.) via `var()` in MUI `sx` props. Never hardcode hex except in pushpin radial gradients.
- **Do** assign every card a unique slight rotation between -2.3° and +2.3° to maintain the pinned-by-hand feel.
- **Do** use the full cork board background (texture + radial gradient overlay) on every screen, including app screens.
- **Do** pair every card with exactly one pushpin element, positioned at the top.
- **Do** keep body text measure at 55ch or below for readability.
- **Do** use Source Sans 3 for any paragraph of three or more sentences — handwriting fonts lose legibility at length.

### Don't:
- **Don't** use border-radius on cards, buttons, or containers. Paper has sharp corners.
- **Don't** use pure white (#FFFFFF) or pure black (#000000) anywhere. Warm Cream is the lightest surface; Ink Blue is the darkest foreground.
- **Don't** use gradients on surfaces (except the cork background texture and pushpin radial gradients). Paper is flat.
- **Don't** use MUI's default theme values (rounded corners, gray backgrounds, Material shadows) for any user-facing surface. The MUI theme in `theme.ts` overrides all defaults; use shared sx objects from `board.ts` for board-specific patterns (cork background, paper cards, pushpins, CTA buttons).
- **Don't** set Barlow Condensed in sentence case or without letter-spacing. It is always uppercase and tracked.
- **Don't** align cards to a perfect grid. Slight rotation and offset are mandatory, not decorative.
- **Don't** use dark mode. The cork board exists under warm ambient light. There is no dark variant.
