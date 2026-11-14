Context.dev
Context.dev is a web scraping API for AI agents and LLMs. The design system emphasizes technical clarity through a vibrant blue-dominant aesthetic paired with minimalist white surfaces, creating a sense of precision and developer-friendly approachability.

Colors
surface
#ffffff
surface-dim
#f5f5f5
surface-bright
#ffffff
surface-container-lowest
#fafafa
surface-container-low
#f0f0f0
surface-container
#eeeeee
surface-container-high
#e1e4e8
surface-container-highest
#d0d7de
on-surface
#030712
on-surface-variant
#57606a
inverse-surface
#0d1117
inverse-on-surface
#f0f6fc
outline
#444444
outline-variant
#aaaaaa
surface-tint
#268bff
primary
#268bff
on-primary
#ffffff
primary-container
#cee0f9
on-primary-container
#001d3d
inverse-primary
#79b8ff
secondary
#4a6fd4
on-secondary
#ffffff
secondary-container
#edf3fd
on-secondary-container
#0d1f4d
tertiary
#6b21a8
on-tertiary
#ffffff
tertiary-container
#b392f0
on-tertiary-container
#2d0052
error
#f97583
on-error
#ffffff
error-container
#ffb4ab
on-error-container
#3d0001
primary-fixed
#cee0f9
primary-fixed-dim
#79b8ff
on-primary-fixed
#001d3d
on-primary-fixed-variant
#004b94
secondary-fixed
#edf3fd
secondary-fixed-dim
#4a6fd4
on-secondary-fixed
#0d1f4d
on-secondary-fixed-variant
#2d4a7b
tertiary-fixed
#b392f0
tertiary-fixed-dim
#6b21a8
on-tertiary-fixed
#2d0052
on-tertiary-fixed-variant
#8b5cf6
background
#ffffff
on-background
#030712
surface-variant
#e1e4e8
Typography
display
fontFamily: IBM Plex Sans · fontSize: 60px · fontWeight: 700 · lineHeight: 68px · letterSpacing: -0.04em
headline-lg
fontFamily: IBM Plex Sans · fontSize: 50px · fontWeight: 400 · lineHeight: 58px · letterSpacing: -0.02em
headline-md
fontFamily: IBM Plex Sans · fontSize: 32px · fontWeight: 600 · lineHeight: 40px · letterSpacing: -0.01em
title-lg
fontFamily: IBM Plex Sans · fontSize: 20px · fontWeight: 600 · lineHeight: 28px · letterSpacing: 0em
body-lg
fontFamily: IBM Plex Sans · fontSize: 18px · fontWeight: 400 · lineHeight: 28px · letterSpacing: 0em
body-md
fontFamily: IBM Plex Sans · fontSize: 16px · fontWeight: 400 · lineHeight: 24px · letterSpacing: 0em
label-md
fontFamily: IBM Plex Sans · fontSize: 14px · fontWeight: 500 · lineHeight: 20px · letterSpacing: 0.01em
label-sm
fontFamily: IBM Plex Sans · fontSize: 12px · fontWeight: 500 · lineHeight: 16px · letterSpacing: 0.05em
Design guidance
Overview
Context.dev is a developer-focused web scraping API platform designed for AI agents and LLM pipelines. The design system embodies "Technical Minimalism"—a philosophy that combines vibrant, energetic primary blues (#268bff, #4a6fd4) with clean white surfaces and precise typography to convey both sophistication and accessibility. The brand serves software engineers and AI teams who demand clarity, speed, and reliability. The visual language prioritizes function over decoration: every color choice, spacing decision, and component state directly supports the user's mental model of data extraction and API integration. Voice: direct, precise, and action-oriented. Example: "Extract any URL to markdown in milliseconds—no parsing headaches, no rate limits."

Colors
The color system is anchored in a vibrant blue primary (#268bff) that dominates CTAs, links, and interactive states, signaling trust and technical competence. This is paired with a secondary blue (#4a6fd4) for supporting accents and secondary UI elements. The surface stack uses pure white (#ffffff) as the base, with a carefully calibrated gray progression (from #fafafa to #d0d7de) for container hierarchy and subtle depth. The on-surface text color is near-black (#030712) for maximum readability at 16px body copy. Tertiary purple (#6b21a8) is reserved for status indicators and advanced features. Error states use a warm red (#f97583) for immediate visual distinction. Usage rules: Primary (#268bff) is applied to all primary CTAs (buttons, links), active tab indicators, and focus states with a

Typography
The type system uses IBM Plex Sans exclusively, a geometric sans-serif that conveys technical precision while remaining approachable. Display (60px, 700 weight, -0.04em tracking) anchors hero sections with commanding presence. Headline-lg (50px, 400 weight) is used for main page titles, allowing the typeface's clean geometry to breathe. Headline-md (32px, 600 weight) structures section breaks. Body-md (16px, 400 weight, 24px line-height) is the primary reading size, set at 1.5x line-height for comfortable scanning of API documentation and feature descriptions. Label-md (14px, 500 weight) is applied to all button text and UI labels, with 0.01em tracking for subtle emphasis. The type hierarchy reinforces information architecture: larger sizes for primary content, consistent weight progressio

Layout
The layout uses a 12-column grid with a max-width of 1100px, centered on the viewport. The gutter is 24px, creating a 48px margin on desktop (1280px+) and 24px on tablet. White-space philosophy: use lg spacing (40px) for major section breaks (hero to features, features to pricing), md spacing (24px) for component groups within sections, and sm spacing (12px) for internal component padding. The hero section spans full-width with a gradient background (blue to lighter blue), containing a centered container with headline, subheading, and interactive demo. Cards and input fields use md padding (24px) internally. The container-max-width of 1100px ensures readability while accommodating side-by-side feature cards. Spacing tokens are semantic: use lg for vertical rhythm between major sections, md

Elevation & Depth
Depth is achieved through subtle shadows and border treatments rather than layering. Level 1 (Base): flat white surface (#ffffff) with no shadow, representing the primary content plane. Level 2 (Cards, Inputs): 0 4px 12px rgba(0, 0, 0, 0.1) shadow with a 1px solid border in {colors.surface-variant} (#e1e4e8), creating gentle separation from the background. Level 3 (Modals, Popovers, Hover States): 0 16px 40px rgba(0, 0, 0, 0.12) shadow with the same border treatment, signaling elevated interaction. On hover, cards transition from Level 2 to Level 3 shadow over 200ms. The hero section uses a fu

Shapes
The shape language is "Geometric Precision"—favoring rounded corners that feel technical yet approachable. Buttons use full radius (9999px) for a pill-shaped, friendly appearance that contrasts with the sharp geometry of the type. Cards and containers use lg radius (1rem / 16px) for a balanced, modern look that's neither too sharp nor too soft. Input fields use md radius (0.75rem / 12px) to feel slightly more contained than cards. Badges and small UI elements use full radius (9999px) for visual consistency with buttons. The rationale: full radius on interactive elements (buttons, badges) signa

Components
Action Elements Buttons are the primary interaction mechanism. Primary buttons use {colors.primary} (#268bff) background with white text, 44px height, 12px vertical / 24px horizontal padding, and full radius (9999px). On hover, the background transitions to #1a73e8 over 200ms with ease-out timing. Secondary buttons are transparent with a 1px {colors.outline-variant} border, {colors.primary} text, and the same padding and radius; on hover, the background becomes {colors.surface-container-low} (#f0f0f0). Ghost buttons are transparent with {colors.on-surface} text; on hover, background becomes {colors.surface-container-high} (#e1e4e8). All buttons use label-md typography (14px, 500 weight) and apply a focus state with a 3px primary blue glow.

Containers & Surfaces Cards are the prima

Do's and Don'ts
**Do**

Do use {colors.primary} (#268bff) for all primary CTAs and interactive focus states—it's the brand's signature accent and must be instantly recognizable.
Do maintain 24px gutter spacing on desktop and 12px on mobile to preserve the clean, spacious layout that defines the brand.
Do apply the full radius (9999px) consistently to buttons and badges to signal interactivity and maintain visual cohesion.
Do use IBM Plex Sans exclusively for all typography—its geometric precision reinforces the technical, developer-focused brand identity.
Do transition all hover and focus states over 200ms with ease-out timing to create smooth, predictable interactions.
Do use the surface container stack (#fafafa through #d0d7de) to create visual hierarchy without introducing new colors.
**Don't**

Don't use colors outside the defined palette—the blue-dominant system is intentional and must remain consistent across all surfaces.
Don't apply shadows heavier than lg (0 16px 40px rgba(0, 0, 0, 0.12))—excessive depth contradicts the minimalist aesthetic.
Don't mix typefaces or use system fonts—IBM Plex Sans is the sole typographic voice and must be loaded via @font-face or Google Fonts.
Don't use border-radius values other than the defined scale (sm, DEFAULT, md, lg, xl, full)—arbitrary radii break the geometric precision.
Don't apply state transitions faster than 200ms or slower than 400ms—the brand rhythm is snappy but not jarring.
Don't use the tertiary purple (#6b21a8) or error red (#f97583) for primary UI elements—they are reserved for status and advanced features only.
