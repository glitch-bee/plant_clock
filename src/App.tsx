import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { CropsData, ExpandedCropsData, Suggestion, ZoneFrostData } from './lib/planner';
import { formatDate, getZoneFrost, planSuggestionsFromFrosts } from './lib/planner';

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
  const { data: cropsFlowers } = useStaticJson<ExpandedCropsData>('/data/crops_flowers.json');
  const { data: cropsSimple } = useStaticJson<CropsData>('/data/crops.json');
  // Merge expanded datasets if both present
  const mergedExpanded: ExpandedCropsData | null = useMemo(() => {
    if (cropsExpanded && cropsFlowers) {
      return {
        metadata: { ...cropsExpanded.metadata, version: cropsExpanded.metadata.version ?? cropsFlowers.metadata.version },
        crops: [...cropsExpanded.crops, ...cropsFlowers.crops],
      };
    }
    return cropsExpanded ?? cropsFlowers ?? null;
  }, [cropsExpanded, cropsFlowers]);
  const crops = (mergedExpanded as unknown as CropsData | null) ?? cropsSimple ?? null;
  const { data: zones } = useStaticJson<ZoneFrostData>('/data/zones_frost.json');

  const [zone, setZone] = useState<string>('6b');
  const [category, setCategory] = useState<'food' | 'flower' | 'herb'>('food');
  const [method, setMethod] = useState<'direct' | 'transplant' | 'either' | 'start_indoors'>('either');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [manualLF, setManualLF] = useState<string | null>(() => localStorage.getItem('lf'));
  const [manualFF, setManualFF] = useState<string | null>(() => localStorage.getItem('ff'));

  const date = useMemo(() => new Date(dateStr), [dateStr]);

  const frosts = useMemo(() => {
    if (!zones) return null;
    if (manualLF && manualFF) {
      return {
        lastFrost: new Date(`${date.getFullYear()}-${manualLF}`),
        firstFrost: new Date(`${date.getFullYear()}-${manualFF}`),
      };
    }
    return getZoneFrost(zone, zones, date);
  }, [zones, zone, manualLF, manualFF, date]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!crops || !frosts) return [];
    return planSuggestionsFromFrosts({ date, category, method }, crops, frosts);
  }, [crops, frosts, date, category, method]);

  return (
    <div className="app">
      <h1>Plant Clock</h1>
      <p className="tagline">Quick planting suggestions by USDA zone and date (demo)</p>

      <form className="controls" onSubmit={(e) => e.preventDefault()}>
        <label>
          USDA Zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b','12a','12b','13a','13b'].map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
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
        <h3>Frost anchors</h3>
        {!frosts ? (
          <p>Loading zones…</p>
        ) : (
          <div className="card">
            <div>Last frost: {formatDate(frosts.lastFrost)} | First frost: {formatDate(frosts.firstFrost)}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="MM-DD last"
                value={manualLF ?? ''}
                onChange={(e) => setManualLF(e.target.value)}
              />
              <input
                type="text"
                placeholder="MM-DD first"
                value={manualFF ?? ''}
                onChange={(e) => setManualFF(e.target.value)}
              />
              <button onClick={() => { if (manualLF) localStorage.setItem('lf', manualLF); if (manualFF) localStorage.setItem('ff', manualFF); }}>Save</button>
              <button onClick={() => { localStorage.removeItem('lf'); localStorage.removeItem('ff'); setManualLF(null); setManualFF(null); }}>Reset</button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>Suggestions</h2>
  {!crops || !frosts ? (
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
        <small>Demo data only. v0.1</small>
      </footer>
    </div>
  );
}

export default App;
