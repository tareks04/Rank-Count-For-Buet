import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Moon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { BoardBreakdown } from './components/BoardBreakdown';
import { RankCurveChart } from './components/RankCurveChart';
import { RankGauge } from './components/RankGauge';
import { SubjectCalculator } from './components/SubjectCalculator';
import {
  BOARDS,
  FLOOR,
  MAX_MARK,
  QUICK_MARKS,
  TOTAL_POOL,
  VerdictTier,
  cutoffs,
  estimate,
  fmt,
  round10,
  validateMarkInput,
  verdict,
} from './utils/rankEstimator';

function getInitialMark(): string {
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('mark');
    if (param !== null && param.trim() !== '') {
      return param.trim();
    }
  }
  return '536';
}

function getReleasesUrl(): string | null {
  const configuredRepo = import.meta.env.VITE_GITHUB_REPO?.trim();
  if (configuredRepo) {
    return `https://github.com/${configuredRepo}/releases/latest`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.github.io')) {
      const owner = host.replace(/\.github\.io$/, '');
      const repoSegment = window.location.pathname.split('/').filter(Boolean)[0];
      if (owner && repoSegment) {
        return `https://github.com/${owner}/${repoSegment}/releases/latest`;
      }
    }
  }
  return null;
}

const VERDICT_STYLES: Record<VerdictTier, string> = {
  safe: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  borderline: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',
  risk: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',
  outside: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
};

function VerdictIcon({ tier }: { tier: VerdictTier }) {
  if (tier === 'safe') return <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
  if (tier === 'outside') return <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />;
  return <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />;
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [markInput, setMarkInput] = useState<string>(getInitialMark);
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<string>('');
  const [showSubjects, setShowSubjects] = useState(false);
  const [subjects, setSubjects] = useState({ physics: '', chemistry: '', math: '' });
  const [displayLikely, setDisplayLikely] = useState<number>(0);

  const shownRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const cutoffBounds = useMemo(() => cutoffs(), []);
  const validation = useMemo(() => validateMarkInput(markInput), [markInput]);

  const currentEstimate = useMemo(() => {
    if (validation.status !== 'valid') return null;
    return estimate(validation.mark);
  }, [validation]);

  const currentVerdict = useMemo(() => {
    if (!currentEstimate) return null;
    return verdict(currentEstimate);
  }, [currentEstimate]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Smooth animated rank readout
  useEffect(() => {
    if (!currentEstimate) {
      shownRef.current = 0;
      setDisplayLikely(0);
      return;
    }

    const target = currentEstimate.likely;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || shownRef.current === 0) {
      shownRef.current = target;
      setDisplayLikely(target);
      return;
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const start = shownRef.current;
    const t0 = performance.now();
    const duration = 220;

    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      const value = start + (target - start) * ease;
      shownRef.current = value;
      setDisplayLikely(value);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        shownRef.current = target;
        setDisplayLikely(target);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [currentEstimate]);

  const handleSubjectChange = (
    subject: 'physics' | 'chemistry' | 'math',
    value: string
  ) => {
    const next = { ...subjects, [subject]: value };
    setSubjects(next);

    if (next.physics === '' && next.chemistry === '' && next.math === '') return;

    const total =
      Number(next.physics || 0) +
      Number(next.chemistry || 0) +
      Number(next.math || 0);
    const clamped = Math.max(0, Math.min(MAX_MARK, Math.round(total)));
    setMarkInput(String(clamped));
  };

  const setTotalMarkDirectly = (value: string) => {
    setMarkInput(value);
    if (subjects.physics !== '' || subjects.chemistry !== '' || subjects.math !== '') {
      setSubjects({ physics: '', chemistry: '', math: '' });
    }
  };

  const sliderValue =
    validation.status === 'valid'
      ? validation.mark
      : validation.status === 'below_floor'
        ? FLOOR
        : 536;

  const activeMark = validation.status === 'valid' ? validation.mark : null;

  const topPercent = currentEstimate
    ? Math.max(0.01, (currentEstimate.likely / TOTAL_POOL) * 100)
    : 0;

  const boardRankText =
    currentEstimate && selectedBoardIndex !== ''
      ? `≈ #${fmt(round10(currentEstimate.rows[Number(selectedBoardIndex)].rank))}`
      : 'Pick a board';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-[#070b14] dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Clean Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800/90">
          <div className="min-w-0">
            <h1 className="font-display text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
              PCM Nationwide Rank Estimator
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              পিসিএম (পদার্থবিজ্ঞান + রসায়ন + উচ্চতর গণিত) মোট নম্বর দিয়ে সারাদেশে আনুমানিক অবস্থান
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-slate-800 transition-colors hover:border-sky-500 hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-400"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4" aria-hidden="true" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" aria-hidden="true" />
                <span>Dark</span>
              </>
            )}
          </button>
        </header>

        {/* Main Two-Column Analytical Workspace */}
        <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Controls + Estimated Result + Breakdown */}
          <div className="space-y-5 lg:col-span-6">
            {/* Input Control Deck */}
            <section
              aria-label="PCM marks input"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="mark-input"
                    className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400"
                  >
                    Total PCM marks (out of 600)
                  </label>
                  <input
                    id="mark-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_MARK}
                    step={1}
                    placeholder="e.g. 536"
                    value={markInput}
                    onChange={(e) => setTotalMarkDirectly(e.target.value)}
                    className="font-mono-num h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-lg font-bold text-slate-900 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="board-select"
                    className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400"
                  >
                    Your board (optional)
                  </label>
                  <select
                    id="board-select"
                    value={selectedBoardIndex}
                    onChange={(e) => setSelectedBoardIndex(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-50"
                  >
                    <option value="">Not selected</option>
                    {BOARDS.map((b, i) => (
                      <option key={b.name} value={String(i)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Range Scrubber */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <label htmlFor="mark-slider" className="font-medium">
                    Scrub marks ({FLOOR} – {MAX_MARK})
                  </label>
                  <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                    {validation.status === 'valid' || validation.status === 'below_floor'
                      ? `${validation.mark} / 600`
                      : '– / 600'}
                  </span>
                </div>
                <input
                  id="mark-slider"
                  type="range"
                  min={FLOOR}
                  max={MAX_MARK}
                  step={1}
                  value={sliderValue}
                  onChange={(e) => setTotalMarkDirectly(e.target.value)}
                  className="pcm-slider"
                />
              </div>

              {/* Preset Bar & Subject Calculator Toggle */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Quick test:
                  </span>
                  {QUICK_MARKS.map((preset) => {
                    const isActive = activeMark === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTotalMarkDirectly(String(preset))}
                        className={`font-mono-num min-h-[34px] rounded-lg border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${
                          isActive
                            ? 'border-sky-500 bg-sky-500/12 text-sky-700 dark:border-sky-400 dark:text-sky-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  aria-expanded={showSubjects}
                  aria-controls="subject-calculator-panel"
                  onClick={() => setShowSubjects((prev) => !prev)}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${
                    showSubjects
                      ? 'border-sky-500 bg-sky-500/12 text-sky-700 dark:border-sky-400 dark:text-sky-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Subject calculator</span>
                </button>
              </div>

              {showSubjects && (
                <SubjectCalculator
                  physics={subjects.physics}
                  chemistry={subjects.chemistry}
                  math={subjects.math}
                  onChange={handleSubjectChange}
                />
              )}

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Physics + Chemistry + Higher Math, added together. Chart models marks of {FLOOR} and above.
              </p>
            </section>

            {/* Validation / Empty / Result Card */}
            {validation.status === 'empty' && (
              <section
                data-testid="empty-state"
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900/90"
              >
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Enter your total PCM mark ({FLOOR}–{MAX_MARK}), scrub the slider, or click any point on the curve to estimate your nationwide rank.
                </p>
              </section>
            )}

            {(validation.status === 'invalid' || validation.status === 'below_floor') && (
              <section
                role="alert"
                data-testid="validation-message"
                className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-5 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">{validation.message}</p>
              </section>
            )}

            {currentEstimate && currentVerdict && (
              <section
                aria-label="Estimated nationwide rank result"
                data-testid="result-card"
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90"
              >
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <RankGauge
                    topPercent={topPercent}
                    likelyRank={currentEstimate.likely}
                    totalPool={TOTAL_POOL}
                    tier={currentVerdict.tier}
                  />

                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                      Estimated nationwide position
                    </div>
                    <div
                      data-testid="likely-rank"
                      className="font-mono-num mt-1 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-sky-300"
                    >
                      ≈ #{fmt(round10(displayLikely || currentEstimate.likely))}
                    </div>
                    <div className="font-mono-num mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      Likely ≈ #{fmt(round10(currentEstimate.likely))} · Worst case ≈ #
                      {fmt(round10(currentEstimate.worst))}
                    </div>

                    <div className="mt-3">
                      <span
                        data-testid="verdict-badge"
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                          VERDICT_STYLES[currentVerdict.tier]
                        }`}
                      >
                        <VerdictIcon tier={currentVerdict.tier} />
                        <span>{currentVerdict.label}</span>
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {currentVerdict.text}
                    </p>
                  </div>
                </div>

                {/* Hairline-divided Stat Strip (No nested cards) */}
                <div className="mt-5 grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 pt-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800 dark:border-slate-800">
                  <div className="py-2 sm:py-0 sm:pr-4">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Top percent ({FLOOR}+)
                    </div>
                    <div className="font-mono-num mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {topPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="py-2 sm:px-4 sm:py-0">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Your board rank
                    </div>
                    <div
                      data-testid="board-rank"
                      className={`mt-0.5 whitespace-nowrap ${
                        selectedBoardIndex !== ''
                          ? 'font-mono-num text-lg font-bold text-slate-900 dark:text-slate-100'
                          : 'text-sm font-medium text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {selectedBoardIndex !== '' ? boardRankText : 'Select board'}
                    </div>
                  </div>
                  <div className="py-2 sm:py-0 sm:pl-4">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      BUET 10k cutoff
                    </div>
                    <div className="font-mono-num mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {cutoffBounds.likely}–{cutoffBounds.worst}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Interactive Curve + Board Breakdown */}
          <div className="space-y-5 lg:col-span-6">
            <section
              aria-labelledby="curve-heading"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="curve-heading"
                  className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Nationwide Rank Curve ({FLOOR} – {MAX_MARK})
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3 bg-sky-500 dark:bg-sky-400" />
                    Likely
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3 bg-amber-600 dark:bg-amber-400" />
                    Worst case
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3 bg-emerald-600 dark:bg-emerald-400" />
                    10,000 cap
                  </span>
                </div>
              </div>

              <RankCurveChart
                activeMark={activeMark}
                isDark={isDark}
                onSelectMark={(m) => setTotalMarkDirectly(String(m))}
              />

              <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                Hover or tap anywhere on the curve to inspect ranks; click a point to set your mark.
              </p>
            </section>

            {currentEstimate && (
              <BoardBreakdown
                rows={currentEstimate.rows}
                selectedBoardIndex={selectedBoardIndex}
              />
            )}
          </div>
        </main>

        {/* Methodology and Disclaimer at Bottom of Page */}
        <section
          aria-label="Methodology and disclaimer"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400"
        >
          <p>
            <strong className="font-semibold text-slate-900 dark:text-slate-200">
              How this works.
            </strong>{' '}
            The numbers come from the board-wise rank chart published by{' '}
            <a
              href="https://ebr.bd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              <span>EBR.BD</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>{' '}
            (before re-scrutiny). Dhaka and Rajshahi have several data points, so those are interpolated directly. The other boards only publish their #1 mark and their rank at 510, so their curve is modelled on Dhaka&apos;s shape (the &ldquo;likely&rdquo; figure) or as a straight line (the &ldquo;worst case&rdquo; figure), and extrapolated smoothly down to {FLOOR}.
          </p>
          <p className="mt-3">
            <strong className="font-semibold text-slate-900 dark:text-slate-200">
              BUET top-10,000 estimate:
            </strong>{' '}
            about{' '}
            <strong className="font-mono-num font-semibold text-slate-900 dark:text-slate-200">
              {cutoffBounds.likely}
            </strong>{' '}
            marks (up to{' '}
            <strong className="font-mono-num font-semibold text-slate-900 dark:text-slate-200">
              {cutoffBounds.worst}
            </strong>{' '}
            in the worst case). This is an unofficial estimate, not a board or BUET list. The chart counts every student with those marks, including some who are not GPA 5 or will not apply, so your real position among BUET applicants is probably a little better. Always check BUET&apos;s published list and circular.
          </p>
        </section>

        <footer className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-slate-500 dark:text-slate-400">
          <span>&copy; By Tarek</span>
          {(() => {
            const releasesUrl = getReleasesUrl();
            if (!releasesUrl) return null;
            return (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  <span>Android APK (Releases)</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            );
          })()}
        </footer>
      </div>
    </div>
  );
}
