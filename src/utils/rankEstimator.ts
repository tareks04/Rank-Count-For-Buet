export interface BoardPoint {
  readonly mark: number;
  readonly rank: number;
}

export interface BoardData {
  readonly name: string;
  readonly top: number;
  readonly n: number;
  readonly pts?: ReadonlyArray<readonly [number, number]>;
}

export type EstimationMode = 'likely' | 'worst';

export interface BoardEstimateRow {
  readonly name: string;
  readonly n: number;
  readonly above: number;
  readonly rank: number;
}

export interface RankEstimate {
  readonly mark: number;
  readonly likely: number;
  readonly worst: number;
  readonly rows: readonly BoardEstimateRow[];
}

export interface CutoffBounds {
  readonly likely: number;
  readonly worst: number;
}

export type VerdictTier = 'safe' | 'borderline' | 'risk' | 'outside';

export interface VerdictInfo {
  readonly tier: VerdictTier;
  readonly label: string;
  readonly text: string;
}

export interface CurvePoint {
  readonly m: number;
  readonly likely: number;
  readonly worst: number;
}

export const FLOOR = 470;
export const DATA_FLOOR = 510;
export const MAX_MARK = 600;
export const CAP = 10000;
export const QUICK_MARKS = [490, 520, 536, 550] as const;

export const BOARDS: readonly BoardData[] = [
  {
    name: 'Dhaka',
    top: 589,
    n: 7214,
    pts: [
      [589, 1],
      [557, 1000],
      [546, 2000],
      [537, 3000],
      [530, 4000],
      [523, 5000],
      [517, 6000],
      [511, 7000],
      [510, 7214],
    ],
  },
  {
    name: 'Rajshahi',
    top: 591,
    n: 1591,
    pts: [
      [591, 1],
      [546, 500],
      [528, 1000],
      [510, 1591],
    ],
  },
  { name: 'Comilla', top: 585, n: 432 },
  { name: 'Jessore', top: 593, n: 925 },
  { name: 'Chittagong', top: 585, n: 1096 },
  { name: 'Barisal', top: 583, n: 166 },
  { name: 'Sylhet', top: 576, n: 396 },
  { name: 'Dinajpur', top: 585, n: 872 },
  { name: 'Mymensingh', top: 586, n: 739 },
  { name: 'Madrasah', top: 587, n: 570 },
];

const SHAPE: readonly (readonly [number, number])[] = (() => {
  const dhaka = BOARDS[0];
  const out: [number, number][] = [];
  if (!dhaka.pts) return out;
  for (const [mark, rank] of dhaka.pts) {
    const t = (mark - DATA_FLOOR) / (dhaka.top - DATA_FLOOR);
    const f = (rank - 1) / (dhaka.n - 1);
    out.push([t, f]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
})();

export function shapeF(t: number): number {
  if (SHAPE.length === 0) return 0;
  if (t <= SHAPE[0][0]) return SHAPE[0][1];
  for (let i = 1; i < SHAPE.length; i++) {
    if (t <= SHAPE[i][0]) {
      const a = SHAPE[i - 1];
      const b = SHAPE[i];
      return a[1] + ((t - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
    }
  }
  return 0;
}

const SHAPE_TAIL_SLOPE = (() => {
  const dt = 0.08;
  return (shapeF(0) - shapeF(dt)) / dt;
})();

export function above(board: BoardData, mark: number, mode: EstimationMode): number {
  if (mark >= board.top) return 0;
  const clampedMark = Math.max(FLOOR, mark);

  if (clampedMark < DATA_FLOOR) {
    const delta = DATA_FLOOR - clampedMark;
    const linearSlope = (board.n - 1) / (board.top - DATA_FLOOR);
    let tailSlope = SHAPE_TAIL_SLOPE * linearSlope;

    if (board.pts && board.pts.length >= 2) {
      const p = board.pts;
      // Use the bottom-most anchor segment near 510 to estimate tail density
      const prev = p[Math.max(0, p.length - 3)];
      const last = p[p.length - 1];
      tailSlope = (last[1] - prev[1]) / (prev[0] - last[0]);
    }

    const slope = mode === 'worst' ? Math.max(linearSlope, tailSlope) : linearSlope;
    return board.n - 1 + slope * delta;
  }

  if (board.pts) {
    const p = board.pts;
    for (let i = 1; i < p.length; i++) {
      if (clampedMark >= p[i][0]) {
        const r =
          p[i - 1][1] +
          ((p[i - 1][0] - clampedMark) / (p[i - 1][0] - p[i][0])) *
            (p[i][1] - p[i - 1][1]);
        return r - 1;
      }
    }
  }

  const t = (clampedMark - DATA_FLOOR) / (board.top - DATA_FLOOR);
  const f = mode === 'worst' ? 1 - t : shapeF(t);
  return f * (board.n - 1);
}

export function national(mark: number, mode: EstimationMode): number {
  let sum = 0;
  for (const board of BOARDS) {
    sum += above(board, mark, mode);
  }
  return 1 + sum;
}

export function estimate(mark: number): RankEstimate {
  const rows: BoardEstimateRow[] = BOARDS.map((board) => {
    const ab = above(board, mark, 'likely');
    return {
      name: board.name,
      n: board.n,
      above: ab,
      rank: ab + 1,
    };
  });

  return {
    mark,
    likely: national(mark, 'likely'),
    worst: national(mark, 'worst'),
    rows,
  };
}

export function cutoffs(): CutoffBounds {
  let likely: number | null = null;
  let worst: number | null = null;

  for (let k = FLOOR; k <= MAX_MARK; k++) {
    if (likely === null && national(k, 'likely') <= CAP) likely = k;
    if (worst === null && national(k, 'worst') <= CAP) worst = k;
  }

  return {
    likely: likely ?? FLOOR,
    worst: worst ?? MAX_MARK,
  };
}

export function verdict(est: RankEstimate): VerdictInfo {
  if (est.worst <= CAP) {
    return {
      tier: 'safe',
      label: 'Safe zone',
      text: 'Even in the worst-case model you are inside the top 10,000.',
    };
  }
  if (est.likely <= CAP) {
    return {
      tier: 'borderline',
      label: 'Likely in, borderline',
      text: 'Likely estimate is inside the top 10,000, though the worst-case line is outside. Keep your application ready.',
    };
  }
  if (est.likely <= CAP * 1.1) {
    return {
      tier: 'risk',
      label: 'At risk',
      text: 'Slightly outside the top 10,000 in the likely model. Real applicants are fewer than chart totals, so watch the official list.',
    };
  }
  return {
    tier: 'outside',
    label: 'Outside top 10,000',
    text: 'This mark is probably outside the 10,000 shortlist if the cap applies in full.',
  };
}

export function round10(x: number): number {
  return Math.max(1, Math.round(x / 10) * 10);
}

export function fmt(n: number): string {
  return Number(n).toLocaleString('en-US');
}

export const SERIES: readonly CurvePoint[] = (() => {
  const arr: CurvePoint[] = [];
  for (let m = FLOOR; m <= MAX_MARK; m++) {
    arr.push({
      m,
      likely: national(m, 'likely'),
      worst: national(m, 'worst'),
    });
  }
  return arr;
})();

export const TOTAL_POOL = SERIES[0].likely;

export type MarkValidationResult =
  | { readonly status: 'empty' }
  | { readonly status: 'invalid'; readonly message: string }
  | { readonly status: 'below_floor'; readonly mark: number; readonly message: string }
  | { readonly status: 'valid'; readonly mark: number };

export function validateMarkInput(raw: string): MarkValidationResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { status: 'empty' };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_MARK) {
    return {
      status: 'invalid',
      message: 'Enter a total between 0 and 600.',
    };
  }

  const mark = Math.round(parsed);
  if (mark < FLOOR) {
    return {
      status: 'below_floor',
      mark,
      message: `The chart only covers marks of ${FLOOR} and above (about ${fmt(
        Math.round(TOTAL_POOL)
      )} students). Below that, your position is further down than the data shows.`,
    };
  }

  return { status: 'valid', mark };
}
