export type FrostInfo = { lastFrost: string; firstFrost: string };
export type ZipFrostData = {
  metadata: { description: string; fallback: FrostInfo };
  zips: Record<string, FrostInfo>;
};

export type Method = 'direct' | 'transplant' | 'either' | 'start_indoors';
export type Category = 'food' | 'flower' | 'herb';

export type Crop = {
  name: string;
  type: Category;
  start: Method;
  spring?: { beforeLastFrost?: number; afterLastFrost?: number } | null;
  fall?: { beforeFirstFrost?: number; afterFirstFrost?: number } | null;
};

export type CropsData = {
  metadata: { description: string; units: string; notes?: string };
  crops: Crop[];
};

// Expanded schema support
export type ExpandedCropWindow = {
  season: 'spring' | 'fall';
  anchor: 'last_frost_spring' | 'first_frost_fall';
  start_days: number; // inclusive
  end_days: number; // inclusive
  methods: Exclude<Method, 'either'>[];
};

export type ExpandedCrop = {
  name: string;
  type: Category | string; // unknown types will be treated as-is
  windows: ExpandedCropWindow[];
  soil_temp_min_c?: number;
  dtm_days?: number;
  notes?: string;
};

export type ExpandedCropsData = {
  metadata: { description: string; version?: string; units?: string; source?: string };
  crops: ExpandedCrop[];
};

export type UserInput = {
  zip: string;
  date: Date; // current date reference
  category: Category;
  method: Method;
};

export type Suggestion = {
  crop: Crop;
  windowStart: Date;
  windowEnd: Date;
  season: 'spring' | 'fall';
  reason: string;
  methods?: Exclude<Method, 'either'>[];
};

// Parse a MM-DD string into a Date in the same year as ref
export function parseMonthDay(md: string, ref: Date): Date {
  const [m, d] = md.split('-').map(Number);
  const dt = new Date(ref.getFullYear(), m - 1, d);
  return dt;
}

export function addDays(date: Date, days: number): Date {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
}

export function isWithin(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function getZipFrost(zip: string, data: ZipFrostData, ref: Date): { lastFrost: Date; firstFrost: Date } {
  const rec = data.zips[zip] ?? data.metadata.fallback;
  const lastFrost = parseMonthDay(rec.lastFrost, ref);
  const firstFrost = parseMonthDay(rec.firstFrost, ref);
  return { lastFrost, firstFrost };
}

export function computeWindows(crop: Crop, frosts: { lastFrost: Date; firstFrost: Date }): { season: 'spring' | 'fall'; start: Date; end: Date }[] {
  const out: { season: 'spring' | 'fall'; start: Date; end: Date }[] = [];
  if (crop.spring) {
    const { beforeLastFrost, afterLastFrost } = crop.spring;
    if (typeof beforeLastFrost === 'number') {
      // Window: [lastFrost - beforeLastFrost, lastFrost]
      const end = frosts.lastFrost;
      const start = addDays(end, -beforeLastFrost);
      out.push({ season: 'spring', start, end });
    }
    if (typeof afterLastFrost === 'number') {
      // Window: [lastFrost + afterLastFrost, lastFrost + afterLastFrost + 14]
      const start = addDays(frosts.lastFrost, afterLastFrost);
      const end = addDays(start, 14);
      out.push({ season: 'spring', start, end });
    }
  }
  if (crop.fall) {
  const { beforeFirstFrost, afterFirstFrost } = crop.fall;
    if (typeof beforeFirstFrost === 'number') {
      const end = frosts.firstFrost;
      const start = addDays(end, -beforeFirstFrost);
      out.push({ season: 'fall', start, end });
    }
    if (typeof afterFirstFrost === 'number') {
      const start = addDays(frosts.firstFrost, afterFirstFrost);
      const end = addDays(start, 14);
      out.push({ season: 'fall', start, end });
    }
  }
  return out;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpandedCropsData(data: unknown): data is ExpandedCropsData {
  if (!data || typeof data !== 'object') return false;
  const maybe = data as { crops?: unknown };
  if (!Array.isArray(maybe.crops) || maybe.crops.length === 0) return false;
  const first = maybe.crops[0] as unknown;
  return !!(first && typeof first === 'object' && 'windows' in (first as Record<string, unknown>));
}

export function planSuggestions(input: UserInput, crops: CropsData | ExpandedCropsData, frost: ZipFrostData): Suggestion[] {
  const frosts = getZipFrost(input.zip, frost, input.date);
  const now = input.date;
  // If dataset looks like expanded schema, use that path
  if (isExpandedCropsData(crops)) {
    const expanded = crops;
    return expanded.crops
      .filter(c => (c.type as string) === input.category)
      .flatMap(c => c.windows.map(w => ({ crop: c, w })))
      .filter(({ w }) => input.method === 'either' || w.methods.includes(input.method as Exclude<Method, 'either'>))
      .flatMap(({ crop, w }) => {
        const anchorDate = w.anchor === 'last_frost_spring' ? frosts.lastFrost : frosts.firstFrost;
        const start = addDays(anchorDate, w.start_days);
        const end = addDays(anchorDate, w.end_days);
        return isWithin(now, addDays(start, -7), addDays(end, 7))
          ? [{
              crop: { name: crop.name, type: crop.type as Category, start: 'either', spring: null, fall: null },
              windowStart: start,
              windowEnd: end,
              season: w.season,
              reason: `Within ${w.season} window for ${crop.name}`,
              methods: w.methods,
            } as Suggestion]
          : [];
      })
      .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime());
  }
  // legacy simple schema
  return (crops as CropsData).crops
    .filter(c => c.type === input.category)
    .filter(c => input.method === 'either' || c.start === 'either' || c.start === input.method)
    .flatMap(crop => {
      const windows = computeWindows(crop, frosts);
      return windows
        .filter(w => isWithin(now, addDays(w.start, -7), addDays(w.end, 7)))
        .map(w => ({
          crop,
          windowStart: w.start,
          windowEnd: w.end,
          season: w.season,
          reason: `Based on ${w.season} window for ${crop.name}`,
        } as Suggestion));
    })
    .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime());
}
