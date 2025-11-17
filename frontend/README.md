# Notethrough Frontend

Modern dashboard built with Next.js 14 (App Router), Tailwind CSS, and shadcn-inspired UI primitives.

## Getting started

```bash
pnpm install   # or npm install / yarn install
pnpm dev       # next dev
```

Environment:

- `NEXT_PUBLIC_API_URL` — points to the FastAPI gateway (defaults to `http://localhost:8000`).
- `NODE_OPTIONS=--no-deprecation` recommended when using pnpm.

## Project layout

- `app/` – server components and routing (App Router).
- `components/` – UI primitives and dashboard widgets.
- `data/` – mock data for static rendering and loading states.
- `lib/` – API helpers (fetchers, formatters).
- `styles/` – theme tokens shared across components.

## Design system

- Dark neon palette inspired by the reference Dribbble shot.
- Elevation via glassmorphism (`card-surface` utility) and soft glow shadows.
- Pills/filters built with `Button` variants; badges for status chips.
- `palette`, `radii`, and `shadows` tokens exported from `styles/theme.ts` for use in component logic.

## Next steps

- Replace mock data with live gateway responses (search, detail modals, recommendations).
- Add interactive charts using `@nivo` or `visx` to visualise spark lines and timelines.
- Integrate auth-aware navigation once the gateway exposes session endpoints.
