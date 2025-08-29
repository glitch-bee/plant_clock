import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { CropsData, ExpandedCropsData, ZipFrostData, UserInput, Suggestion } from './lib/planner';
import { planSuggestions, formatDate } from './lib/planner';

function useStaticJson<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(path)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load ${path}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message));
  }, [path]);
  return { data, error } as const;
}

function App() {
  // Try expanded first, fallback to simple
  const { data: cropsExpanded } = useStaticJson<ExpandedCropsData>('/data/crops_expanded.json');
  const { data: cropsSimple } = useStaticJson<CropsData>('/data/crops.json');
  const crops = (cropsExpanded as unknown as CropsData | null) ?? cropsSimple ?? null;
  const { data: frost } = useStaticJson<ZipFrostData>('/data/zip_frost.json');

  const [zip, setZip] = useState('10001');
  const [category, setCategory] = useState<'food' | 'flower' | 'herb'>('food');
  const [method, setMethod] = useState<'direct' | 'transplant' | 'either' | 'start_indoors'>('either');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const date = useMemo(() => new Date(dateStr), [dateStr]);

  const input: UserInput | null = useMemo(() => {
    if (!crops || !frost) return null;
    return { zip, category, method, date };
  }, [zip, category, method, date, crops, frost]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!input || !crops || !frost) return [];
    return planSuggestions(input, crops, frost);
  }, [input, crops, frost]);

  return (
    <div className="app">
      <h1>Plant Clock</h1>
      <p className="tagline">Quick planting suggestions by ZIP and date (static JSON demo)</p>

      <form className="controls" onSubmit={(e) => e.preventDefault()}>
        <label>
          ZIP Code
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            inputMode="numeric"
            pattern="[0-9]{5}"
            placeholder="12345"
          />
        </label>
        <label>
          Date
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as 'food' | 'flower' | 'herb')}>
            <option value="food">Food</option>
            <option value="flower">Flowers</option>
            <option value="herb">Herbs</option>
          </select>
        </label>
        <label>
          Method
          <select value={method} onChange={(e) => setMethod(e.target.value as 'either' | 'direct' | 'transplant' | 'start_indoors')}>
            <option value="either">Either</option>
            <option value="direct">Direct sow</option>
            <option value="transplant">Transplant</option>
            <option value="start_indoors">Start indoors</option>
          </select>
        </label>
      </form>

      <section>
        <h2>Suggestions</h2>
        {!crops || !frost ? (
          <p>Loading data…</p>
        ) : suggestions.length === 0 ? (
          <p>No exact matches today. Try adjusting method or date. We search within ±7 days of windows.</p>
        ) : (
          <ul className="results">
            {suggestions.map((s, idx) => (
              <li key={idx} className="card">
                <div className="title">
                  {s.crop.name} <span className="badge">{s.season}</span>
                </div>
                <div className="meta">
                  Start: {s.crop.start}
                  <span>Window: {formatDate(s.windowStart)} – {formatDate(s.windowEnd)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <small>Demo data only. Frost dates are approximate. v0.1</small>
      </footer>
    </div>
  );
}

export default App;
