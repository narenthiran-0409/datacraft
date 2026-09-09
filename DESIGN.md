---
name: Lumina Data
colors:
  surface: '#faf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#faf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4ef'
  surface-container: '#efeee9'
  surface-container-high: '#e9e8e3'
  surface-container-highest: '#e3e3de'
  on-surface: '#1b1c19'
  on-surface-variant: '#414845'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#727975'
  outline-variant: '#c1c8c4'
  surface-tint: '#47645a'
  primary: '#324f46'
  on-primary: '#ffffff'
  primary-container: '#4a675d'
  on-primary-container: '#c4e4d7'
  inverse-primary: '#aecdc1'
  secondary: '#8a5016'
  on-secondary: '#ffffff'
  secondary-container: '#feb06e'
  on-secondary-container: '#784105'
  tertiary: '#3a4a65'
  on-tertiary: '#ffffff'
  tertiary-container: '#51627e'
  on-tertiary-container: '#cddeff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9eadd'
  primary-fixed-dim: '#aecdc1'
  on-primary-fixed: '#022019'
  on-primary-fixed-variant: '#304c43'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#ffb77b'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#6d3900'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#b6c7e7'
  on-tertiary-fixed: '#091c34'
  on-tertiary-fixed-variant: '#374762'
  background: '#faf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e3e3de'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is built on a "Human Enterprise" philosophy. It moves away from the cold, mechanical nature of traditional data platforms toward a warm, intelligent, and supportive environment. The system prioritizes clarity over density, using a **Corporate Modern** style infused with **Soft Minimalism** to reduce cognitive load and foster trust.

The target audience consists of data stewards and analysts who require precision but benefit from an interface that feels like a high-end publishing tool rather than a spreadsheet. The UI evokes a sense of "calm authority"—professional enough for enterprise data management, but warm enough to feel approachable and intuitive.

## Colors

This design system utilizes a palette rooted in natural, grounding tones to differentiate from the standard "SaaS Blue" landscape.

- **Primary (Sage):** Used for primary actions, success states, and brand presence. It signals growth and health.
- **Secondary (Amber):** Used for warnings, highlights, and secondary CTAs. It provides warmth and high visibility without being aggressive.
- **Neutral (Navy/Cream):** Deep Navy (#1A2B44) provides high-contrast legibility for text, while the Off-White/Cream (#F9F8F3) replaces pure white to create a paper-like, editorial feel that is easier on the eyes during long work sessions.
- **Gradients:** Use subtle, linear gradients for large surface areas (e.g., Sage to a lighter tint) to add depth without introducing visual noise.

## Typography

The typography strategy balances modern precision with approachable friendliness. **Hanken Grotesk** is used for headlines to provide a distinctive, contemporary character with sharp legibility. **Inter** is utilized for body text and UI labels due to its exceptional performance in data-heavy environments.

Generous line heights (1.6x for body) are mandatory to ensure the "publishing" feel. Large headlines should use tighter letter spacing to maintain a cohesive visual block. Use semantic hierarchy strictly—never skip a heading level.

## Layout & Spacing

The system employs a **Fixed-Fluid Hybrid** grid. While the main content container caps at 1280px to maintain readability of text lines, the internal elements use a fluid 12-column structure. 

Prioritize vertical rhythm using the 8px base unit. This design system explicitly forbids high-density layouts. If a view feels "crowded," increase the stack spacing. For data presentation, replace dense tables with "Data Cards" that utilize the 12-column grid (e.g., 3 cards per row on desktop, 1 on mobile). Every view must maintain a "Safe Zone" of at least 48px padding on desktop to reinforce the minimalist, open aesthetic.

## Elevation & Depth

Depth is created through **Tonal Layers** and **Ambient Shadows** rather than harsh lines. 

- **Surface Levels:** The base background is the warm Off-White. Secondary surfaces (cards, sidebars) use pure white to pop forward.
- **Shadows:** Use extremely soft, diffused shadows with a slight Navy tint (#1A2B44 at 4-8% opacity). Shadows should have a large blur radius (20px+) and a small Y-offset to simulate a gentle lift.
- **Interactions:** On hover, elements should slightly increase their shadow spread and lift (Y-offset) by 2px to provide tactile feedback.

## Shapes

The shape language is consistently **Rounded**. A base radius of 12px (0.75rem) is used for standard components like buttons and inputs. Large containers and cards use a 16px (1rem) radius. This softness communicates the "human-centric" nature of the brand, moving away from the aggressive 90-degree angles often found in technical enterprise software.

## Components

### Buttons & CTAs
Buttons feature 12px rounded corners and subtle gradients. The Primary CTA uses the Sage green with white text. Secondary CTAs use the Cream background with a Sage border.

### Data Cards
Instead of tables, use cards with 16px padding. Each card should have a clear "Title," a "Status Badge," and "Metadata" arranged in a readable grid. Cards use the soft ambient shadow for elevation.

### Status Indicators
Status must be communicated through both color and text labels:
- **Healthy:** Sage Green background, dark green text, check icon.
- **Needs Attention:** Amber background, dark brown text, alert icon.
- **Critical:** Soft Rose background, deep red text, X icon.

### Form Fields
Input fields use the Off-White background with a subtle 1px border in a muted Navy. On focus, the border transitions to Sage with a soft glow (3px spread).

### Navigation
The sidebar uses the Deep Navy background with muted Sage for active states, providing a strong structural anchor to the otherwise light and airy interface.