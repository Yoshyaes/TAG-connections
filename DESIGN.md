# Design System Strategy: TAG Connections

## 1. Overview & Creative North Star
**Creative North Star: "The Neon Monolith"**

This design system moves away from the generic "flat" web look, instead embracing a high-fidelity, tactical gaming aesthetic. We are building a "Neon Monolith"—a UI that feels like a physical, illuminated piece of hardware found in a near-future command center. 

To break the "template" feel, we employ **intentional asymmetry** and **tonal depth**. Rather than centering everything, we use heavy left-aligned typography contrasted against floating, glowing interactive elements. We treat the screen not as a flat canvas, but as a deep space where light (the accent colors) travels through layers of dark glass.

## 2. Colors & Atmospheric Depth
Our palette is rooted in a "Deep Space" foundation, using light to define function rather than structure.

### The Foundation
- **Background:** `surface` (#131318) - The base void.
- **Primary Accent:** `primary_container` (#7C4DFF) - Used for high-energy "Connection" moments and brand identity.
- **Secondary Accent:** `secondary_container` (#00E3FD) - Used for tactical feedback, secondary links, and "Active" states.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Layout boundaries must be established via color shifts. A `surface_container_low` section sitting on a `surface` background provides enough contrast for the eye to perceive a boundary without "trapping" the content in a box.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked tactical panels.
1.  **Level 0 (Base):** `surface` (#131318)
2.  **Level 1 (Main Cards):** `surface_container` (#1F1F24)
3.  **Level 2 (Active Tiles/Modals):** `surface_container_high` (#2A292F)

### The "Glass & Gradient" Rule
To achieve the *Valorant*-inspired polish, use **Glassmorphism**. Floating elements (like category reveals) should use `surface_variant` at 60% opacity with a `backdrop-blur` of 12px. 
*Signature Polish:* Apply a 2% "Noise/Grain" overlay across the entire background to break digital banding and provide a premium, filmic texture.

## 3. Typography: Tactical Editorial
The typography system balances the brutalist, wide nature of Space Grotesk with the utilitarian precision of Inter.

- **Display & Headlines (Space Grotesk, 700/800):** These are your "Hero" moments. Use `display-lg` for victory screens and `headline-md` for category reveals. The tight letter-spacing and heavy weight should feel like a physical stamp on the screen.
- **Titles & Labels (Inter, 600):** Use `title-md` for game tiles. The high x-height of Inter ensures legibility even when tiles are small on mobile layouts.
- **Body (Inter, 400):** Use `body-md` for instructions. Keep line heights generous (1.5) to balance the intensity of the display fonts.

## 4. Elevation & Depth
In this design system, light is the architect. We do not use traditional drop shadows; we use **Ambient Glows**.

- **The Layering Principle:** Depth is achieved by "stacking." A `surface_container_highest` tile should sit atop a `surface_container` background. This creates a soft, natural lift.
- **Ambient Shadows:** For floating modals, use a shadow with a blur of 40px, 0% offset, and 8% opacity. The shadow color must be tinted with `primary` (#CDBDFF) to simulate the glow of the UI onto the background.
- **The "Ghost Border" Fallback:** If a container requires more definition (e.g., on low-contrast mobile screens), use the `outline_variant` token at **15% opacity**. This creates a "barely-there" tactical edge.
- **Neon Accents:** Any "Selected" state should use a 2px outer glow (`box-shadow`) using the `primary_container` color to mimic a neon tube.

## 5. Components

### Cards (Game Tiles)
*   **Structure:** No borders. Use `surface_container` for the resting state. 
*   **Interaction:** On hover/tap, transition to `surface_container_highest` and add a `secondary_container` (Cyan) "Ghost Border" at 20% opacity.
*   **Spacing:** Use `spacing.4` (1rem) for internal padding.

### Buttons (Tactical Actions)
*   **Primary:** Solid `primary_container` (#7C4DFF). Text is `on_primary_container`. High-gloss finish (subtle linear gradient from top-white-5% to bottom-black-5%).
*   **Secondary:** Ghost style. `outline` color for text, no background, `outline_variant` at 20% for the border.
*   **Corner Radius:** Strict `xl` (0.75rem / 10px) across all buttons to maintain the modern game menu feel.

### Category Reveals (The "Valorant" Moment)
*   When a category is solved, the background of the 4-tile group should transform into a gradient using `primary_container` to `inverse_primary`. 
*   Use `display-sm` (Space Grotesk) for the category name, centered with `letter-spacing: -0.05em`.

### Inputs & Search
*   Use `surface_container_lowest` (#0E0E13) to create a "recessed" look. The input should look like it is carved into the UI.

## 6. Do's and Don'ts

### Do
*   **Do** use vertical whitespace (`spacing.8` or `spacing.10`) instead of divider lines between content groups.
*   **Do** use `on_surface_variant` (#CAC3D8) for secondary text to maintain high readability without the harshness of pure white.
*   **Do** apply the 10px (`xl`) border radius consistently to maintain the tactical "hardware" feel.

### Don't
*   **Don't** use 100% opaque, high-contrast borders. It shatters the "Neon Monolith" illusion.
*   **Don't** use standard "drop shadows" (black, high-offset). They feel like a corporate website, not a premium game.
*   **Don't** clutter the screen. If an element isn't interactive or vital information, let it recede into the `surface_dim` background.