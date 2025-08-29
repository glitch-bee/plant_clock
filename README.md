# Plant Clock

Small app that suggests what to plant based on your ZIP code and date. It’s a starter version that runs on static JSON files and a simple UI.

What it does
- You enter a ZIP and a date, pick food/herbs/flowers, and choose a method (direct, transplant, start indoors, or either).
- It looks up frost dates for that ZIP and checks crop “windows” around those anchors.
- If today is close to a window (we allow a small ±7 day buffer), it shows a suggestion.

How it’s wired
- Frontend: Vite + React + TypeScript.
- Data: JSON files in `public/data`. No backend.
- We prefer the “expanded” datasets if present, and fall back to a simple one.

# Plant Clock

Small app that suggests what to plant based on your ZIP code and date. It’s a starter version that runs on static JSON files and a simple UI.

What it does
- You pick a USDA zone and a date, then choose a category (food/herbs/flowers) and method (direct, transplant, start indoors, or either).
- It uses typical frost anchors for that zone and checks crop windows around those.
- If today is close to a window (there’s a small ±7 day buffer), it shows a suggestion.

How it’s wired
- Frontend: Vite + React + TypeScript.
- Data lives in `public/data`. No backend.
- If the expanded datasets are there, those are used. Otherwise it falls back to a simpler one.
- Zone anchors come from `zones_frost.json`. You can also tweak anchors manually and the app will remember them.

Data files
- `public/data/zip_frost.json`
	- Last and first frost dates per ZIP (MM-DD). Includes a fallback used if a ZIP isn’t listed.
- `public/data/crops_expanded.json`
	- Vegetables and herbs. Each crop has one or more windows with:
		- season: spring or fall
		- anchor: last_frost_spring or first_frost_fall
		- start_days / end_days: offsets from the anchor (inclusive)
		- methods: direct, transplant, start_indoors
- `public/data/crops_flowers.json`
	- Same shape as expanded, for flowers. If this file exists, it gets merged with the expanded crops above.
- `public/data/crops.json`
	- Simple fallback dataset (older shape). Only used if the expanded files aren’t available.

Project layout
```
public/
	data/
		zip_frost.json
	zones_frost.json           # USDA zone anchors (used by default)
		crops_expanded.json        # vegetables/herbs (preferred)
		crops_flowers.json         # flowers (optional, merged if present)
		crops.json                 # simple fallback
src/
	lib/
		planner.ts                # date math + suggestion logic (supports both schemas)
	App.tsx                     # form + results list
	App.css                     # light styles
```

Run it locally
```bash
npm install
npm run dev
```
Open the URL printed in the terminal (usually http://localhost:5173).

Build a preview
```bash
npm run build
npm run preview
```

Editing data
- Add or update ZIP entries in `zip_frost.json`.
- Update zone anchors in `zones_frost.json`.
- Add crops to `crops_expanded.json` and `crops_flowers.json` using the same window shape shown above.
- If a ZIP is missing, the fallback frost dates are used so you’ll still get something.

Notes
- Dates here are approximations to get you in the ballpark. Adjust for your microclimate and experience.
Open the URL printed in the terminal (usually http://localhost:5173).

Build a preview
```bash
npm run build
npm run preview
```

Editing data
- Add or update ZIP entries in `zip_frost.json`.
- Add crops to `crops_expanded.json` and `crops_flowers.json`. Use the same window shape shown above.
- If a ZIP is missing, the fallback frost dates are used so you’ll still get something.

Notes
- These dates are approximations meant to get you in the ballpark. Adjust for your microclimate and experience.
