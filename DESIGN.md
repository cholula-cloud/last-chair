# Design Rules

Project UI rules for **Last Chair**, complementing [docs/ART_DIRECTION.md](./docs/ART_DIRECTION.md).

## Surfaces

- **Inner sub-cards and list rows inside a `.panel` always use flat `.well` / `.well-white` surfaces or `.row-divider` rules, never nested `.panel` drop shadows.**
  Why: stacking `3px` borders and hard offset shadows inside panels creates visual clutter and uneven density.
  <!-- 2026-11-22: "things are way too crowded, uneven, unneccasry, choatic, dense, messy. we want elegance, simpificty" + Minimalist Toy-Box Cleanup -->

- **`RadioCard` and dispatch cards always span full column width aligned with sibling `.panel` cards, using an integrated masthead bar (`RadioDiamond` + `100.7 WVTK` badge + speaker) above headline, body, and actions — never a wide left gutter beside a narrow bubble.**
  Why: an external left icon gutter pinches the copy column, misaligns card rails, and splits station identity from the speaker.
  <!-- 2026-11-22: "I feel liek Maris is still in a weird spot; idk just heierachy si kinda weird its like stuffed in there. seems not thoughtful." -->

- **Physical-prop UI elements (tickets, passes) render tangible cardstock cues — circular punched-out holes, grommet eyelets, side notches, and intact unpunched markers — instead of generic boxes with `line-through` text.**
  Why: strikethrough boxes fail to communicate the physical artifact in a narrative beat.
  <!-- 2026-11-22: "the intr's ticket pinched looks nothing like a punched ticket." -->

## Color

## Typography

## Spacing & layout

- **Fixed-count metric strips (4-way weather odds, 3-up stat tiles, and 4-tab segmented bars on `390px` phones) always use an equal-column CSS grid (`grid-cols-4` / `grid-cols-3`) with `tabular-nums`, never `flex-wrap` that orphans items onto a second row.**
  Why: wrapping a single leftover item onto row 2 breaks symmetry and wastes vertical space on mobile.
  <!-- 2026-11-22: "tomorrow's forecase looks weird with the rwo lines.. lets fix that.." + "everything should fit well within iphone and ipad" -->

- **Day HUD ambient dispatches (`HudRadio`) collapse to a compact `44px` key anchored below Play when idle, peeking a transient `6s` swipe-up/X-dismissible toast only on genuinely new intraday events and sharing one top row with `MorningNote` instead of stacking permanent full-width banners over the mountain.**
  Why: a permanent top banner blocks the hill view and goes stale when no fresh event has occurred.
  <!-- 2026-11-23: "the radio is in the way; it needs to toggle down or be able to be hidden or only pop up for a bit... it also doesnt always change info or repreats lots of info" -->

## Motion

## Interaction

## Copy

- **Night and summary sheets never add standalone derived cash rows (such as `"Projected morning cash"`) beneath the main sign when today's cash delta and top-bar cash are already visible; surface only threshold-critical warnings.**
  Why: secondary derived rows push primary story and action cards below the fold on mobile.
  <!-- 2026-11-22: "we can probably remove 'projeted morning cash' right?" -->
