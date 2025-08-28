export type FrostInfo = { lastFrost: string; firstFrost: string };
export type ZipFrostData = {
  metadata: { description: string; fallback: FrostInfo };
  zips: Record<string, FrostInfo>;
};

export type Crop = {
  name: string;
  type: 'food' | 'flower';
  start: 'direct' | 'transplant' | 'either';
  spring?: { beforeLastFrost?: number; afterLastFrost?: number } | null;
  fall?: { beforeFirstFrost?: number; afterFirstFrost?: number } | null;
};

export type CropsData = {
  metadata: { description: string; units: string; notes?: string };
  crops: Crop[];
};

export type UserInput = {
  zip: string;
  date: Date; // current date reference
  category: 'food' | 'flower';
  method: 'direct' | 'transplant' | 'either';
};

export type Suggestion = {
  crop: Crop;
  windowStart: Date;
  windowEnd: Date;
  season: 'spring' | 'fall';
  reason: string;
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

export function planSuggestions(input: UserInput, crops: CropsData, frost: ZipFrostData): Suggestion[] {
  const frosts = getZipFrost(input.zip, frost, input.date);
  const now = input.date;
  return crops.crops
    .filter(c => c.type === input.category)
    .filter(c => input.method === 'either' || c.start === 'either' || c.start === input.method)
    .flatMap(crop => {
      const windows = computeWindows(crop, frosts);
      return windows
        .filter(w => isWithin(now, addDays(w.start, -7), addDays(w.end, 7))) // forgiving range
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
