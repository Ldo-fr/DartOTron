# 🎨 Arcade Darts CyberHUD — Design System & Specification

> **Source** : Google Stitch — Design System Generator (`12226939549738378094`)
> **Version** : `2.0` (CyberHUD Kiosk / Material Symbols / `--sys-*` CSS Tokens)

---

## 1. Brand & Style

The design system is engineered specifically for connected arcade darts kiosks operating in low-light, high-distraction venues such as competitive arenas, gaming lounges, and bars. The brand persona is competitive, electric, precise, and uncompromisingly utilitarian. The interface commands attention across two distinct viewing contexts:

1. **Distant Stance (1.5m – 3m)** : High-contrast, radiant scoreboard cues, unmistakable legibility of turn tracking, throw history, and round-end verdicts.
2. **Close-Range Interaction (Touch Kiosk)** : Ultra-responsive, arcade-grade tactile feedback, oversized hit targets, and effortless manual score adjustments.

The visual style merges modern cyber-arcade aesthetics with dark industrial minimalism. Structural chrome-tinted dark surfaces are paired with precise neon luminescence and localized light blooms (glows). To prevent cognitive fatigue during extended matches, pure dark canvases act as a void, allowing high-luminescence vectors (neon green, electric cyan, laser crimson, and amber gold) to guide player attention instantly without ambient light glare.

---

## 2. Color Palette & Emissive Tokens (`--sys-color-*`)

The palette leverages emissive visual priority on dark surfaces. Every color maps to specific competitive darts states:

| Role | Token (`tokens.css`) | Hex | Usage |
| :--- | :--- | :---: | :--- |
| **Primary (Bullseye Neon)** | `--sys-color-primary` | `#00ff87` | Validated inputs, bullseyes, scored hits (`<m-hit-impact variant="scored">`), active winner telemetry. |
| **Secondary (Cyber Cyan)** | `--sys-color-secondary` | `#4cd7f6` | Player identities, system settings, mode selection menus, and focus rings. |
| **Danger (Laser Crimson)** | `--sys-color-danger` | `#ff3366` | Missed darts, busts, Crazy Master penalties (`<m-hit-impact variant="penalty">`), destructive actions. |
| **Warning (Tournament Amber)** | `--sys-color-warning` | `#ffd166` | Multipliers, high-score bonuses, Cricket marks, and trophy tiers. |
| **Canvas Void** | `--sys-color-background-void` | `#0a0e18` | Deep void canvas foundation to eliminate glare in dim rooms. |
| **Surface Base** | `--sys-color-background` | `#0f131d` | Main viewport backdrop. |
| **Surface Low (Level 1)** | `--sys-color-surface-low` | `#171b26` | Non-interactive contextual panels and resting scoreboards. |
| **Surface High (Level 2)** | `--sys-color-surface-high` | `#262a35` | Interactive hit targets, game cards, and tactile controls. |
| **Surface Highest (Level 3)** | `--sys-color-surface-highest` | `#313540` | Active headers, modals, and elevated popovers. |
| **Text Primary** | `--sys-color-text-primary` | `#dfe2f1` | High-contrast primary foreground (> 7:1 contrast ratio). |
| **Text Secondary** | `--sys-color-text-secondary` | `#b9cbb9` | Variant labels, subtitles, captions. |
| **Text Muted** | `--sys-color-text-muted` | `#849585` | Neutral/ignored hits (`<m-hit-impact variant="neutral">`), inactive hints. |

---

## 3. Typography (`--sys-font-*`)

The type scale serves two distinct physical distances:

1. **Long-Distance Score Display (Scores, Bullseye callouts, Remaining points)** : Utilizes `display-xl` (`96px`) and `display-lg` (`64px`) rendered in **`Space Grotesk`** with tight kerning (`-0.03em` to `-0.02em`). Tabular figures (`tnum`) are enforced on all numerical telemetry to prevent layout shifts during live scoring.
2. **Close-Range Kiosk Interaction (Player labels, setup screens, turn summaries)** : Utilizes **`Plus Jakarta Sans`** for body copy and **`Share Tech Mono` / `JetBrains Mono`** for digital telemetry badges.

| Scale | Font Family | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `display-xl` | `Space Grotesk` | `96px` (`6rem`) | `700` | `100px` | `-0.03em` |
| `display-lg` | `Space Grotesk` | `64px` (`4rem`) | `700` | `72px` | `-0.02em` |
| `headline-lg` | `Space Grotesk` | `40px` (`2.5rem`) | `700` | `48px` | `-0.01em` |
| `headline-md` | `Space Grotesk` | `32px` (`2rem`) | `600` | `40px` | `0` |
| `headline-sm` | `Space Grotesk` | `24px` (`1.5rem`) | `600` | `32px` | `0` |
| `title-lg` | `Space Grotesk` | `20px` (`1.25rem`) | `600` | `28px` | `0` |
| `body-lg` | `Plus Jakarta Sans` | `18px` (`1.125rem`) | `500` | `26px` | `0` |
| `body-md` | `Plus Jakarta Sans` | `16px` (`1rem`) | `400` | `24px` | `0` |
| `label-lg` | `Space Grotesk` | `16px` (`1rem`) | `700` | `20px` | `0.06em` |
| `label-md` | `Space Grotesk` | `14px` (`0.875rem`) | `700` | `18px` | `0.08em` |
| `label-sm` | `Space Grotesk` | `12px` (`0.75rem`) | `600` | `16px` | `0.10em` |

---

## 4. Layout & Spacing (`--sys-spacing-*`)

Kiosk interfaces are responsive across full-screen 16:9 touch monitors and TV displays:
- **Upper Tier (Eye Level, 1.5m–3m visibility)** : Match status, round tracker, active turn score readout, and opponent summaries.
- **Lower Tier (Waist/Arm Level, 0.4m–0.8m touch zone)** : Interactive controls, undo/miss/next-player tactile bar, and lobby navigation.

Padding and touch bounding boxes adhere strictly to arcade standards:
- Base touch targets never fall below `56px` in height/width, expanding to `72px–88px` for primary action buttons.

---

## 5. Elevation & Depth (`--sys-shadow-*`)

Visual depth is achieved through **tonal layers and emissive neon boundaries** rather than flat drop shadows:

1. **Surface Inset (Background)** : Deep void (`#0a0e18`) with no borders.
2. **Resting Containers (Panels, Score Cards)** : `#171b26` surface with a `1px` ghost border (`rgba(255, 255, 255, 0.08)`).
3. **Active/Interactive Surface** : `#262a35` surface with colored outline in secondary or primary tone (`4px` solid border on selected game cards).
4. **Active Turn State (Emissive Bloom)** :
   - Outer glow: `box-shadow: 0 0 24px rgba(0, 255, 135, 0.35), 0 0 4px rgba(0, 255, 135, 0.6)`
   - Inner rim lighting: `inset 0 1px 0 rgba(255, 255, 255, 0.2)`

---

## 6. Shapes & Radii (`--sys-radius-*`)

The design system incorporates structured geometric contours with controlled bevels:
- `--sys-radius-sm` (`0.25rem` / `4px`) : Compact badges and indicators.
- `--sys-radius-md` (`0.5rem` / `8px`) : Arcade industrial standard for buttons and inputs.
- `--sys-radius-lg` (`0.75rem` / `12px`) : Inner panels and metric cards.
- `--sys-radius-xl` (`1rem` / `16px`) : Major parent cards, player pods, and touch numpad surrounds.
- `--sys-radius-2xl` (`1.5rem` / `24px`) : Critical confirmation dialogs and victory ceremonies.
- `--sys-radius-full` (`9999px`) : Circular pills, shockwave rings, and localized blur medallions.

---

## 7. Raw Design Tokens Reference (YAML)

```yaml
name: Arcade Darts CyberHUD
version: "2.0"
colors:
  surface: "#0f131d"
  surface-dim: "#0f131d"
  surface-bright: "#353944"
  surface-container-lowest: "#0a0e18"
  surface-container-low: "#171b26"
  surface-container: "#1c1f2a"
  surface-container-high: "#262a35"
  surface-container-highest: "#313540"
  on-surface: "#dfe2f1"
  on-surface-variant: "#b9cbb9"
  inverse-surface: "#dfe2f1"
  inverse-on-surface: "#2c303b"
  outline: "#849585"
  outline-variant: "#3b4b3d"
  surface-tint: "#00e478"
  primary: "#f1ffef"
  on-primary: "#003919"
  primary-container: "#00ff87"
  on-primary-container: "#007138"
  inverse-primary: "#006d36"
  secondary: "#4cd7f6"
  on-secondary: "#003640"
  secondary-container: "#03b5d4"
  on-secondary-container: "#00424e"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  bullseye-neon: "#00ff87"
  cyber-cyan: "#4cd7f6"
  laser-crimson: "#ff3366"
  tournament-amber: "#ffd166"
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
```
