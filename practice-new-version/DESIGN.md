---
version: alpha
name: FlowTask
description: >
  Warm coral-and-lavender light theme paired with a deep-navy indigo-and-lime
  dark theme, for a two-pane email inbox UI (list + detail, with status
  badges and a chat sidebar).
colors:
  bg-light: "#F3E9FB"
  surface-light: "#FFFFFF"
  text-light: "#000000"
  text-secondary-light: "#6B7280"
  primary-light: "#F67B56"
  secondary-light: "#C19BE9"
  success-light: "#8FD19E"
  danger-light: "#F3A6A6"
  bg-dark: "#040415"
  surface-dark: "#12121F"
  text-dark: "#FFFFFF"
  text-secondary-dark: "#9497AC"
  primary-dark: "#4D4DE4"
  accent-yellow-dark: "#E9F15C"
  success-dark: "#8FE0A8"
  danger-dark: "#F08A8A"
typography:
  h1:
    fontFamily: HK Grotesk
    fontSize: 2rem
    fontWeight: 700
  h2:
    fontFamily: HK Grotesk
    fontSize: 1.15rem
    fontWeight: 700
  body-md:
    fontFamily: HK Grotesk
    fontSize: 0.95rem
    fontWeight: 400
  label-sm:
    fontFamily: HK Grotesk
    fontSize: 0.8rem
    fontWeight: 600
  caption:
    fontFamily: HK Grotesk
    fontSize: 0.75rem
    fontWeight: 400
rounded:
  sm: 8px
  md: 14px
  lg: 24px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary-light:
    backgroundColor: "{colors.text-light}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: transparent
    rounded: "{rounded.md}"
    padding: "10px 20px"
  badge-status:
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    typography: "{typography.label-sm}"
  card-light:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.lg}"
---

## Overview

Two independent moods, not one palette recolored: **light** is soft and
warm — a lavender-to-peach gradient canvas under white cards, black as the
only "hard" color. **Dark** is cool and dense — near-black navy with a
single saturated indigo accent doing all the work buttons and active states
need.

## Colors

**Light** — `bg-light` (#F3E9FB) is a soft lavender-to-peach gradient wash
behind everything; `surface-light` (#FFFFFF) is where content actually
sits (cards, pills, the search field). `text-light` (#000000) is pure
black — used sparingly, mainly for the page title and the solid
"Add task" button, so it reads as the strongest weight on the page.
`primary-light` (#F67B56, coral) marks the active tab and the "Design"
type pill. `secondary-light` (#C19BE9, lavender) marks the "Frontend"
type pill and echoes the background gradient. `success-light`/
`danger-light` are pale outline fills for "Low"/"High" priority — kept
desaturated so they never compete with the coral accent.

**Dark** — `bg-dark` (#040415) is a near-black navy, flat rather than
gradient. `surface-dark` (#12121F) lifts cards and the active tab pill
one step off the background. `text-dark` (#FFFFFF) is used generously
here (headings, nav, active tab) since the dark canvas has no black to
compete with. `primary-dark` (#4D4DE4, indigo) is the single accent — every affordance
that would be coral in light mode (primary button, active/selected state)
is this indigo in dark mode instead. `accent-yellow-dark` (#E9F15C) is
reserved for a status badge, giving the dark theme a second, higher-energy
accent that light mode doesn't have.

> The dark palette's exact accent hex (`primary-dark`, `accent-yellow-dark`)
> is read off the swatch image, not machine-verified — the source export
> mislabeled all four swatches with the same hex, so treat those two as
> close visual estimates and eyeball-adjust if reused pixel-for-pixel.

## Typography

Single family, **HK Grotesk**, across both themes — a rounded-terminal
grotesk that keeps the UI feeling friendly rather than corporate. Screen
and pane titles (`h1`) are bold and large against otherwise-quiet body
text; `h2` is the same weight at a smaller size for subsection labels
(e.g. an email's subject in the detail pane). List/body content stays at
`body-md` regular weight, with `label-sm` (semi-bold, smaller) reserved
for badge text so statuses stay legible at a compact size without
competing with row text.

## Layout

Two-pane content: a fixed-width list (inbox) on the left, a flexible
detail pane on the right, each its own rounded, bordered panel — not a
single continuous page. A collapsible, resizable panel sits at the outer
edge for chat, independent of the two content panes. Row/list items keep
secondary metadata (sender, snippet, timestamp) in the muted secondary
text color, reserving full-strength text for the primary line (subject,
name).

## Shapes

Pill (`rounded.pill`) is reserved for badges only — status/label pills,
not buttons or containers. Buttons and inputs use the mid radius
(`rounded.md`); panels and cards use the largest radius (`rounded.lg`)
so they read as soft containers rather than hard boxes. Nothing uses a
sharp corner — the smallest radius in the scale (`rounded.sm`, 8px) is
still visibly rounded, for the tightest inline elements only.

## Components

- **Primary button** — light mode inverts to solid black on white
  (`button-primary-light`); dark mode uses the indigo accent
  (`button-primary-dark`). Both use the mid radius with generous
  horizontal padding.
- **Secondary button** — outline/ghost variant, same shape as primary
  but no fill, in both themes.
- **Status badge** (`badge-status`) — small filled or outline pill,
  color keyed to meaning (e.g. unread/replied/flagged) rather than to
  theme; only the specific hues shift between light and dark.
- **Panel/card** (`card-light` / `card-dark`) — bordered, rounded
  container; the base unit both the list and detail panes are built
  from.

## Do's and Don'ts

- **Do** keep black/white as the "loud" neutral in light mode and let
  color stay confined to badges and the single primary accent — the
  gradient background is the only place light mode gets soft.
- **Do** let dark mode's indigo accent do double duty (primary actions
  *and* selected/active state) rather than introducing a second
  dark-mode accent beyond the yellow reserved for status badges.
- **Don't** mix the two themes' accent roles — coral has no place in dark
  mode, indigo has no place in light mode.
- **Don't** use pill shape outside of badges — buttons, inputs, and
  containers stay on the `md`/`lg` radius scale.
</content>
