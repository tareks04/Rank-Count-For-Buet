import React from 'react';

interface SubjectCalculatorProps {
  physics: string;
  chemistry: string;
  math: string;
  onChange: (subject: 'physics' | 'chemistry' | 'math', value: string) => void;
}

export const SubjectCalculator: React.FC<SubjectCalculatorProps> = ({
  physics,
  chemistry,
  math,
  onChange,
}) => {
  return (
    <div
      id="subject-calculator-panel"
      className="mt-4 grid grid-cols-1 gap-3 border-t border-dashed border-slate-200 pt-4 sm:grid-cols-3 dark:border-slate-800"
    >
      <div>
        <label
          htmlFor="subject-phy"
          className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400"
        >
          Physics (/200)
        </label>
        <input
          id="subject-phy"
          type="number"
          inputMode="numeric"
          min={0}
          max={200}
          placeholder="180"
          value={physics}
          onChange={(e) => onChange('physics', e.target.value)}
          className="font-mono-num min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
        />
      </div>

      <div>
        <label
          htmlFor="subject-chem"
          className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400"
        >
          Chemistry (/200)
        </label>
        <input
          id="subject-chem"
          type="number"
          inputMode="numeric"
          min={0}
          max={200}
          placeholder="176"
          value={chemistry}
          onChange={(e) => onChange('chemistry', e.target.value)}
          className="font-mono-num min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
        />
      </div>

      <div>
        <label
          htmlFor="subject-math"
          className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400"
        >
          H. Math (/200)
        </label>
        <input
          id="subject-math"
          type="number"
          inputMode="numeric"
          min={0}
          max={200}
          placeholder="180"
          value={math}
          onChange={(e) => onChange('math', e.target.value)}
          className="font-mono-num min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
        />
      </div>
    </div>
  );
};
