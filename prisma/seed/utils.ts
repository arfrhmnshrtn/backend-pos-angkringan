/**
 * Seeded PRNG (Mulberry32) for deterministic, reproducible random data.
 * Given the same seed, produces the same sequence of numbers.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Weighted random selection. Items is array of { weight: number, ...rest } */
  weighted<T extends { weight: number }>(items: readonly T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let r = this.next() * totalWeight;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  }

  /** Weighted selection from a record of { key: weight } */
  weightedKey<K extends string>(weights: Readonly<Record<K, number>>): K {
    const entries = Object.entries(weights) as Array<[K, number]>;
    const totalWeight = entries.reduce((sum, [, w]) => sum + (w as number), 0);
    let r = this.next() * totalWeight;
    for (const [key, weight] of entries) {
      r -= weight as number;
      if (r <= 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  /** Pick N unique items from array (Fisher-Yates partial shuffle) */
  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
      const j = this.int(i, copy.length - 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
      result.push(copy[i]);
    }
    return result;
  }

  /** Return true with given probability (0-1) */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/**
 * Create a WIB (UTC+7) Date from a date string and hour/minute/second.
 * Stores as UTC but represents the correct WIB time.
 */
export function createWibDate(
  dateStr: string,
  hour: number,
  minute: number,
  second: number,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  // WIB = UTC+7, so subtract 7 hours from WIB to get UTC
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute, second));
}

/**
 * Get all dates between start and end (inclusive) as YYYY-MM-DD strings.
 */
export function getDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Get day of week for a YYYY-MM-DD string (0=Mon, 6=Sun).
 */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // JS getUTCDay: 0=Sun, 1=Mon ... 6=Sat -> convert to 0=Mon..6=Sun
  const jsDay = dt.getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Get month (1-12) from YYYY-MM-DD string
 */
export function getMonth(dateStr: string): number {
  return parseInt(dateStr.split('-')[1], 10);
}

/**
 * Simple progress bar for console output.
 */
export function progressBar(label: string, current: number, total: number): void {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round(percent / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  process.stdout.write(`\r  ${label.padEnd(20)} [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Format number as Indonesian Rupiah string.
 */
export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

/**
 * Pick a random hour based on HOUR_WEIGHTS using the seeded random.
 */
export function pickHour(rng: SeededRandom, hourWeights: readonly number[]): number {
  const items = hourWeights.map((weight, hour) => ({ hour, weight })).filter(h => h.weight > 0);
  return rng.weighted(items).hour;
}
