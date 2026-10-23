<div align="center">

# LineageFlow
### *Draw the family you actually have.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Local-First](https://img.shields.io/badge/Privacy-100%25%20Local-success?style=for-the-badge)](#highlights)
[![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20TypeScript%20%7C%20Tailwind-black?style=for-the-badge&logo=nextdotjs)](#tech)

<p align="center">
  <b>An interactive family tree maker built for multiple marriages.</b><br>
  No account, no setup. Open it and start drawing.
</p>

```text
Add a person  ->  add a spouse, add another  ->  add children to each union  ->  done
```

---

</div>

## What is it?

Most family tree tools assume one marriage per person. Real families are messier: remarriages, half-siblings, step-parents.

**LineageFlow** models each union as its own node, so every marriage keeps its own children and the diagram stays unambiguous.

---

## Highlights

<table>
<tr>
<td width="50%">

### Multi-Union Modeling
* A person can have any number of marriages or partners.
* Each union is color-coded: 1st marriage, 2nd+ marriage, divorced.
* Half-siblings and step-parents stay clear.

</td>
<td width="50%">

### Zero Friction
* No sign-up and no backend.
* Your data stays in your browser.
* Import and export as JSON.

</td>
</tr>
</table>

---

## Roadmap

| Status | Feature |
| :--- | :--- |
| Done | Port of the original single-file prototype to Next.js + TypeScript |
| Done | Autosave (`localStorage`), undo/redo history, dark mode |
| Done | PNG & SVG diagram export, shareable URL links |
| Done | Mobile-ready touch pan, pinch zoom, and bottom-sheet inspector |

---

## Getting Started

```bash
git clone https://github.com/KrisnaSantosa15/LineageFlow.git
cd LineageFlow
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run the tests with `npm test`.

---

## Tech

Next.js (App Router), TypeScript, Tailwind CSS v4, Vitest. Deployed on Vercel.

The original prototype is kept in [`family_lineage_diagram_maker.html`](family_lineage_diagram_maker.html) for reference.

---

## License

This project is licensed under the [MIT License](LICENSE).
