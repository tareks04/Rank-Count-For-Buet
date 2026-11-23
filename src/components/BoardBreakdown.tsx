import React from 'react';
import { BoardEstimateRow, fmt } from '../utils/rankEstimator';

interface BoardBreakdownProps {
  rows: readonly BoardEstimateRow[];
  selectedBoardIndex: string;
}

export const BoardBreakdown: React.FC<BoardBreakdownProps> = ({
  rows,
  selectedBoardIndex,
}) => {
  const maxAbove = Math.max(1, ...rows.map((r) => r.above));
  const selectedIdx = selectedBoardIndex === '' ? -1 : Number(selectedBoardIndex);

  return (
    <section
      aria-labelledby="board-breakdown-heading"
      data-testid="board-breakdown"
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90"
    >
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="board-breakdown-heading"
          className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          Board-by-Board Breakdown
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Students estimated above you
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => {
          const isSelected = idx === selectedIdx;
          const pct = Math.max(0, Math.min(100, (row.above / maxAbove) * 100));
          return (
            <div
              key={row.name}
              data-selected={isSelected ? 'true' : 'false'}
              className="grid grid-cols-[100px_1fr_64px] items-center gap-3 text-[13px]"
            >
              <div
                className={`truncate ${
                  isSelected
                    ? 'font-bold text-sky-600 dark:text-sky-400'
                    : 'font-medium text-slate-700 dark:text-slate-300'
                }`}
              >
                {row.name}
                {isSelected ? ' (You)' : ''}
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950/70">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-sky-400'
                      : 'bg-gradient-to-r from-indigo-500 to-sky-500'
                  }`}
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
              <div className="font-mono-num text-right text-xs font-semibold text-slate-600 dark:text-slate-400">
                {fmt(Math.round(row.above))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
