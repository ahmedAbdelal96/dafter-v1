You are working on a production SaaS dashboard called "Hasba" for merchants, invoices, receivables, payments, customers, suppliers, employees, and accounting workflows.

Your mission is to perform a full UI refresh across the web dashboard without changing the business logic, routing, API contracts, or core functionality.

========================
PRIMARY GOAL
========================
Transform the current admin-template feel into a more premium, modern, financial SaaS design system.

The current UI has these problems:

1. Light mode feels too flat, washed out, and template-like.
2. Dark mode is too heavy, too dramatic, and uses too much glow / green atmosphere.
3. The product lacks a strong visual identity.
4. Surface hierarchy is weak: page background, cards, tables, and sidebar feel too similar.
5. Accent colors are either underused in light mode or overused in dark mode.
6. The overall result feels like a generic admin dashboard rather than a focused financial/business product.

The new design direction should be:

- Neutral UI first
- Brand accents second
- Clean financial SaaS
- Premium but practical
- Calm, readable, daily-use interface
- Better visual hierarchy
- Less “template”
- Less glow
- Better spacing and surface contrast
- Better information density without clutter

========================
IMPORTANT CONSTRAINTS
========================

- Do NOT change business logic.
- Do NOT rename modules, routes, entities, or features.
- Do NOT remove any existing important functionality.
- Do NOT redesign flows in a way that breaks user habits.
- Do NOT add fake data or demo-only hacks.
- Do NOT make the interface playful or startup-cute.
- Do NOT make it neon, over-gradient, or cyber-looking.
- Keep the UI suitable for real merchants, accountants, and daily operators.

========================
NEW VISUAL DIRECTION
========================
Adopt a "Neutral Finance UI + Brand Accents" approach.

The UI should feel like:

- modern financial SaaS
- merchant/accounting dashboard
- business tool used every day
- trustworthy
- elegant
- clear

Avoid:

- excessive green tint everywhere
- strong green/blue atmospheric backgrounds
- overly dark surfaces
- excessive shadows/glows
- generic TailAdmin default look
- washed-out light mode

========================
COLOR STRATEGY
========================
Use a restrained, semantic color system.

Brand color remains green, but only as an accent — not a full-page tint.

Use this direction:

LIGHT MODE

- app background: very light neutral/slate tint
- cards: white
- tertiary surfaces: soft gray
- primary text: deep slate
- secondary text: muted slate
- borders: subtle gray, visible but soft
- primary actions: green
- success: green
- warning: amber
- danger: red
- info/neutral analytics: blue

DARK MODE

- app background: navy-charcoal / slate, not green-black
- cards: slightly lighter than background
- tertiary surfaces: one step above cards
- text: soft white / cool gray
- borders: visible but subtle
- primary actions: green accent
- success: green
- warning: amber
- danger: red
- info/neutral analytics: blue

IMPORTANT:
Dark mode must be calmer and easier to use for long sessions.
Remove the exaggerated atmospheric green background feel.

========================
TARGET PALETTE
========================
Use or adapt this palette consistently:

Brand / Primary

- primary: #1F7A5A
- primary-hover: #16624A
- primary-active: #145742
- primary-soft: #E8F5EF

Light mode

- bg: #F8FAFC
- surface: #FFFFFF
- surface-secondary: #F2F4F7
- text-primary: #111827
- text-secondary: #475467
- text-muted: #667085
- border-light: #EAECF0
- border-strong: #D0D5DD

Dark mode

- bg: #0F1720
- surface: #151F2B
- surface-secondary: #1B2633
- text-primary: #F5F7FA
- text-secondary: #D0D5DD
- text-muted: #98A2B3
- border-light: #223042
- border-strong: #2B3A4D

Status

- success: #1F7A5A / dark: #33A074
- warning: #D97706 / dark: #F59E0B
- danger: #DC2626 / dark: #EF4444
- info: #2563EB / dark: #60A5FA

========================
DESIGN SYSTEM RULES
========================

1. Surfaces

- Clear hierarchy between page background, cards, table containers, inputs, and sidebar.
- Cards should feel distinct from background.
- Tables should not blend into the page.
- Sidebar should feel part of the product, not a disconnected overlay.

2. Borders

- Prefer clean subtle borders over heavy shadow/glow.
- Use borders consistently to define layers.
- Avoid washed-out borderless cards.

3. Shadows

- Minimize heavy shadows.
- Use very soft elevation only where helpful.
- Remove dramatic glow effects.

4. Radius

- Use a consistent radius system.
- The interface should feel modern and cohesive.
- Suggested:
  - cards: rounded-2xl or strong xl
  - buttons/inputs: rounded-xl
  - pills/badges: rounded-full or rounded-lg

5. Typography

- Improve visual hierarchy using spacing, weight, and contrast.
- Large Arabic page titles should feel premium and clear.
- Secondary descriptions should be quieter but still readable.
- Table headers should be more readable and structured.

6. Accent usage

- Green should be used for:
  - primary CTA buttons
  - active states
  - success states
  - selected filters when appropriate
  - positive values (when meaningful)
- Do NOT tint the whole UI green.

7. Charts

- Charts should feel cleaner and more integrated with the theme.
- Improve chart container styling.
- Keep grid lines subtle.
- Improve legend readability.
- Ensure chart colors are consistent and elegant.

========================
COMPONENTS TO REFRESH
========================
Apply the design system refresh across the entire dashboard, including but not limited to:

- sidebar
- top navbar
- search bar
- page headers
- stat cards
- filters row
- buttons
- inputs
- select fields
- tables
- table headers
- table rows
- pagination
- modal surfaces
- badges / status pills
- chart cards
- quick action cards
- dashboard widgets
- empty states
- hover states
- focus states
- loading states if present

========================
SIDEBAR SPECIFIC IMPROVEMENTS
========================

- Make the sidebar visually cleaner and less template-like.
- Reduce the gap between sidebar visual identity and main content.
- Active item should feel premium and clear, not overly glowing.
- Icon color hierarchy should be improved.
- Section labels should feel more refined.
- Spacing and rhythm should feel intentional.
- In dark mode, sidebar should not overpower the main content.

========================
TABLE SPECIFIC IMPROVEMENTS
========================
Tables are critical for this product.

Improve them to feel like a serious financial tool:

- stronger header separation
- better row readability
- improved number alignment and scanning
- cleaner action icon spacing
- clearer status badges
- better use of muted text for secondary info
- improve row hover treatment
- improve pagination appearance
- make dense data feel easier to scan

Do not over-style tables. Keep them professional.

========================
DASHBOARD SPECIFIC IMPROVEMENTS
========================
The dashboard should feel more premium and informative:

- stat cards need better hierarchy and spacing
- chart cards need better surfaces and header treatment
- quick action section should feel structured and useful
- alerts / notices should feel visible but not alarming
- layout should feel balanced with better whitespace
- light mode must not look empty
- dark mode must not look heavy

========================
UX IMPROVEMENTS
========================
Improve UX visually without changing core behavior:

- better spacing between sections
- better button hierarchy
- clearer active/inactive filter states
- more readable forms
- stronger focus states
- better visual distinction between primary and secondary actions
- improve readability for Arabic UI specifically
- improve perceived speed through cleaner surfaces and feedback
- preserve familiar workflows

========================
IMPLEMENTATION TASKS
========================

1. Audit the existing global theme file / tokens / CSS variables.
2. Replace the current color system with a more neutral finance-oriented system.
3. Remove template leftovers, inconsistent token definitions, and old color remnants.
4. Reduce or remove heavy background gradients/glows.
5. Rework light and dark semantic tokens.
6. Update component styles globally where possible.
7. Refine layout styling for dashboard pages, listing pages, and management pages.
8. Update card, table, sidebar, and form styles to match the new direction.
9. Keep all changes production-safe and maintainable.
10. Prefer token-based refactoring over hardcoded one-off colors.
11. Ensure consistency across all pages.

========================
OUTPUT EXPECTATION
========================
Make the code changes directly.

Then provide:

1. A summary of what visual problems were found.
2. What design system changes were made.
3. Which global tokens were updated.
4. Which major components were visually refreshed.
5. Any places that still need manual design review.

========================
SUCCESS CRITERIA
========================
The final UI should:

- feel less like a generic TailAdmin template
- feel more like a real financial/business SaaS
- have a cleaner and more premium light mode
- have a calmer and more usable dark mode
- show clearer hierarchy between surfaces
- use green more intelligently
- preserve the speed and practicality of the current product
- look better across dashboard, listing, and management screens

Extra implementation notes:

- Prefer neutral surfaces and stronger hierarchy over decorative effects.
- Reduce full-page color tinting.
- Replace atmospheric gradients with cleaner backgrounds.
- Use semantic color tokens rather than component-specific hacks.
- Improve the sidebar so it feels integrated, not detached.
- Make tables more readable and premium.
- Keep dark mode calmer than the current version.
- Keep light mode less washed out than the current version.
- Do not redesign into a totally different product — this is a refinement, not a reinvention.

D:\Web\full-projects\daftar-v1\dafter-dashboard
