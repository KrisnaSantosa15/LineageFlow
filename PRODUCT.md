# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind v4, hosted on Vercel. Chosen by the user after comparing it with Vite + React; the main app is a client-side component. Beware hydration issues with `window`/`localStorage`.

## Users

Anyone who needs a quick, shareable family diagram with no account and no setup, including hobbyists and families sketching their own tree for casual, personal use.

## Product Purpose

An interactive family tree and diagram maker. Users add relatives, arrange them on a pan/zoom canvas, and import/export the result as JSON. Success is a clear, correct diagram made in minutes.

## Positioning

Multi-union modeling. A person can have several marriages or partners, each with its own children, shown as union hubs with distinct styling for 1st marriage, 2nd+ marriage, and divorced/ex.

## Operating Context

Used in a browser on desktop and possibly mobile. The canvas is the main surface, with an inspector panel for editing members and a modal for adding relatives. The existing prototype is [family_lineage_diagram_maker.html](family_lineage_diagram_maker.html), a single file of about 1,740 lines of vanilla JS and Tailwind CDN.

## Capabilities and Constraints

- Existing: custom layout engine for multi-union trees, pan/zoom, fit and center, search, inspector, add-relative modal (child, sibling, spouse, existing spouse), set root person, delete, JSON import/export, and presets (multi-marriage demo, 5-generation ancestry, blank).
- Product name in the prototype: "LineageFlow" (Multi-Union). Whether to keep it is undecided.
- Undecided: autosave, PNG/SVG export, undo/redo, dark mode, shareable URL state. Not confirmed.
- Must be deployable on Vercel. A GitHub repo with a beautiful but minimal README is required.

## Brand Commitments

None confirmed beyond the prototype's current name. No visual constraints were stated.

## Evidence on Hand

The working prototype HTML and its three sample presets. No testimonials, usage data, or screenshots exist yet.

## Product Principles

- Zero friction: no account, no setup, and data stays with the user.
- Relationships are modeled correctly first, including multiple unions, and drawn second.
- Import/export keeps diagrams portable and owned by the user.
- A faithful port comes before new features.

## Accessibility & Inclusion

No specific standard was stated. Family structures are diverse, so labels and relationship copy should avoid assuming a single family model.
