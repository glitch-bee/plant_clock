# Plant Clock

A simple, static MVP that suggests planting windows by ZIP code and date.

- Vite + React + TypeScript
- Static JSON for frost dates and crop guidelines in `public/data`
- Filters by category (food/flower) and method (direct/transplant/either)

## Quick start

```bash
npm install
npm run dev
```

Open the app at the URL printed in the terminal (default http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Data

- `public/data/zip_frost.json` – approximate last and first frost dates for a few sample ZIP codes, with a fallback.
- `public/data/crops.json` – simplified crop windows as offsets from frost dates; includes type and start method.

You can expand both datasets over time or replace with an API later.

## Notes

This is a demo and dates are approximate. Use local guidance for final decisions.
