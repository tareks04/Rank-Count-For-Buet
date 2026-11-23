import React from 'react';
import { FLOOR, VerdictTier } from '../utils/rankEstimator';

interface RankGaugeProps {
  topPercent: number;
  likelyRank: number;
  totalPool: number;
  tier: VerdictTier;
}

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIER_STROKE: Record<VerdictTier, string> = {
  safe: '#10b981',
  borderline: '#f59e0b',
  risk: '#f59e0b',
  outside: '#f43f5e',
};

export const RankGauge: React.FC<RankGaugeProps> = ({
  topPercent,
  likelyRank,
  totalPool,
  tier,
}) => {
  const progress = Math.max(0.03, Math.min(1, 1 - (likelyRank - 1) / totalPool));
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const strokeColor = TIER_STROKE[tier];

  return (
    <div
      className="relative flex h-[152px] w-[152px] shrink-0 items-center justify-center"
      aria-label={`Top ${topPercent.toFixed(1)} percent of ${FLOOR} plus pool`}
    >
      <svg
        viewBox="0 0 140 140"
        className="h-full w-full -rotate-90 overflow-visible"
        aria-hidden="true"
      >
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 420ms cubic-bezier(0.22, 1, 0.36, 1), stroke 220ms ease',
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Top Pool
        </span>
        <strong className="font-mono-num text-2xl font-bold text-slate-900 dark:text-slate-50">
          {topPercent.toFixed(1)}%
        </strong>
      </div>
    </div>
  );
};
