---
name: Precision Minimalist
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c3caac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8d9479'
  outline-variant: '#434933'
  surface-tint: '#a6d700'
  primary: '#ffffff'
  on-primary: '#273500'
  primary-container: '#bdf500'
  on-primary-container: '#536d00'
  inverse-primary: '#4e6700'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#ffffff'
  on-tertiary: '#1f333f'
  tertiary-container: '#d0e5f6'
  on-tertiary-container: '#536775'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bdf500'
  primary-fixed-dim: '#a6d700'
  on-primary-fixed: '#151f00'
  on-primary-fixed-variant: '#3a4d00'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#d0e5f6'
  tertiary-fixed-dim: '#b5c9da'
  on-tertiary-fixed: '#081e2a'
  on-tertiary-fixed-variant: '#364957'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.15em
spacing:
  unit: 8px
  container-padding: 40px
  gutter: 24px
  panel-width: 360px
---

## Brand & Style

The design system is rooted in the "Precision Minimalist" aesthetic, drawing inspiration from high-end Swiss design and modern architectural studios. It prioritizes clarity over decoration, using stark contrast and intentional negative space to create an atmosphere of focus and professional intimacy. 

The system rejects common "AI" visual metaphors—such as ethereal glows or fluid meshes—in favor of a structural, grounded approach. The emotional response is one of absolute reliability and premium craftsmanship. It is designed for high-stakes 1-on-1 conversations where the interface disappears, leaving only the participants and their shared insights.

## Colors

The palette is strictly functional and high-contrast. The foundation is a pure **Deep Black (#000000)**, providing a void-like background that eliminates edge distractions during video calls. 

- **Primary Accent:** Neon Yellow/Green (#c5ff00) is reserved exclusively for high-priority actions, active states, and critical alerts. It acts as a beacon within the dark interface.
- **Primary Text:** Pure White (#FFFFFF) for maximum legibility and a sharp, editorial look.
- **Grayscale Tier:** 
    - *Gray-800 (#1A1A1A):* For secondary containers and panel backgrounds.
    - *Gray-600 (#333333):* For borders and inactive icons.
    - *Gray-400 (#666666):* For secondary metadata and placeholder text.

## Typography

This design system utilizes **Inter** for its neutral, architectural quality. To achieve a "premium human" feel, the system employs aggressive tracking (letter spacing) on labels and headlines, creating an airy, intentional rhythm.

- **Headlines:** Use tight tracking for large display type to create impact, but switch to generous tracking for sub-headers.
- **Body:** Optimized for readability in speech logs with increased line height to prevent fatigue during long reading sessions.
- **Labels:** Always uppercase with high tracking to denote technical or systemic information without overwhelming the visual hierarchy.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main video stage utilizes a fluid layout to maximize the screen, while utility panels (like speech logs) occupy a fixed width on the right trailing edge.

- **Rhythm:** An 8px base grid governs all dimensions. 
- **Margins:** Generous 40px outer margins ensure the interface feels "framed" like a piece of art rather than crowded software.
- **Hierarchy:** Elements are grouped using whitespace rather than dividers wherever possible. Large gaps between the video feed and the controls emphasize the "minimal" philosophy.

## Elevation & Depth

In line with the sharp-line philosophy, the design system avoids shadows entirely. Depth is communicated through **Tonal Layering** and **Stroke Weight**:

- **Level 0 (Base):** Pure #000000.
- **Level 1 (Panels):** Gray-800 (#1A1A1A) with a 1px solid Gray-600 border.
- **Level 2 (Overlays/Popovers):** Gray-800 with a 1px pure White border to denote "active" elevation.
- **Interaction:** Controls do not lift off the page; instead, they change stroke weight or color-fill to the primary accent (#c5ff00).

## Shapes

The design system is strictly **Sharp (0px radius)**. Every container, button, and input field uses 90-degree angles to maintain a disciplined, professional, and agency-grade aesthetic. This geometric rigidity differentiates the product from the consumer-grade "softness" of competitors.

## Components

### Video Containers
Video feeds are raw rectangles with no border-radius. Controls (Mute, Camera, Leave) appear only on hover as a floating bar at the bottom center. The "Leave" button is the only element allowed to use a distinct red stroke; all other active toggles use the #c5ff00 accent.

### Buttons & Inputs
- **Primary Button:** Solid #c5ff00 fill with black text. No gradients.
- **Secondary Button:** Transparent fill with a 1px white border.
- **Input Fields:** A single 1px white line at the bottom (underline style) for room codes. Placeholders are in Gray-400 and disappear on focus.

### Speech Logs
The side panel uses Gray-800 background. Text is presented in a monochromatic timeline. The speaker's name uses the `label-caps` style. Real-time transcription is highlighted using a 2px left-border of #c5ff00 to show the "active" speaking state.

### Status Indicators
Small, 8px solid squares (not circles) of #c5ff00 placed in the corner of video feeds to indicate "Live" or "Synced" status.