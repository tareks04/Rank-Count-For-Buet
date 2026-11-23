import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAP,
  FLOOR,
  MAX_MARK,
  SERIES,
  TOTAL_POOL,
  fmt,
  round10,
} from '../utils/rankEstimator';

interface RankCurveChartProps {
  activeMark: number | null;
  isDark: boolean;
  onSelectMark: (mark: number) => void;
}

const PAD = { left: 50, right: 16, top: 18, bottom: 30 };
const MAX_AXIS_RANK = Math.max(TOTAL_POOL, SERIES[0].worst);

export const RankCurveChart: React.FC<RankCurveChartProps> = ({
  activeMark,
  isDark,
  onSelectMark,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverMark, setHoverMark] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 480,
    height: 290,
  });

  const xForMark = useCallback((m: number, w: number) => {
    return PAD.left + ((m - FLOOR) / (MAX_MARK - FLOOR)) * (w - PAD.left - PAD.right);
  }, []);

  const yForRank = useCallback((r: number, h: number) => {
    return PAD.top + ((r - 1) / (MAX_AXIS_RANK - 1)) * (h - PAD.top - PAD.bottom);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const updateSize = () => {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(280, Math.round(rect.width));
      const height = Math.max(240, Math.round(rect.height));
      setCanvasSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width: w, height: h } = canvasSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cAccent = isDark ? '#38bdf8' : '#0284c7';
    const cWarn = isDark ? '#fbbf24' : '#d97706';
    const cGood = isDark ? '#34d399' : '#059669';
    const cMuted = isDark ? '#94a3b8' : '#475569';
    const cGrid = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)';
    const cGuide = isDark ? 'rgba(148, 163, 184, 0.48)' : 'rgba(15, 23, 42, 0.35)';

    // Safe Top-10,000 zone shading
    const yCap = yForRank(CAP, h);
    ctx.fillStyle = isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.07)';
    ctx.fillRect(PAD.left, PAD.top, w - PAD.left - PAD.right, yCap - PAD.top);

    // Horizontal grid + rank labels
    ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    [1, 5000, 10000, 15000, 20000, 25000].forEach((rk) => {
      if (rk > MAX_AXIS_RANK + 500) return;
      const y = yForRank(rk, h);
      ctx.strokeStyle = rk === CAP ? cGood : cGrid;
      ctx.lineWidth = rk === CAP ? 1.5 : 1;
      ctx.setLineDash(rk === CAP ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(w - PAD.right, y);
      ctx.stroke();

      ctx.fillStyle = rk === CAP ? cGood : cMuted;
      ctx.fillText(rk === 1 ? '#1' : `${rk / 1000}k`, PAD.left - 8, y);
    });
    ctx.setLineDash([]);

    // Vertical grid + mark labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [470, 490, 510, 530, 550, 575, 600].forEach((mk) => {
      const x = xForMark(mk, w);
      ctx.strokeStyle = cGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, h - PAD.bottom);
      ctx.stroke();

      ctx.fillStyle = cMuted;
      ctx.fillText(String(mk), x, h - PAD.bottom + 8);
    });

    // Uncertainty ribbon between Likely and Worst
    ctx.beginPath();
    SERIES.forEach((pt, i) => {
      const x = xForMark(pt.m, w);
      const y = yForRank(pt.likely, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let j = SERIES.length - 1; j >= 0; j--) {
      ctx.lineTo(xForMark(SERIES[j].m, w), yForRank(SERIES[j].worst, h));
    }
    ctx.closePath();
    ctx.fillStyle = isDark ? 'rgba(251, 191, 36, 0.13)' : 'rgba(217, 119, 6, 0.11)';
    ctx.fill();

    // Worst-case dashed line
    ctx.beginPath();
    SERIES.forEach((pt, i) => {
      const x = xForMark(pt.m, w);
      const y = yForRank(pt.worst, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = cWarn;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Likely curve
    ctx.save();
    ctx.beginPath();
    SERIES.forEach((pt, i) => {
      const x = xForMark(pt.m, w);
      const y = yForRank(pt.likely, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = cAccent;
    ctx.lineWidth = 2.75;
    ctx.stroke();
    ctx.restore();

    // Focus marker
    const focus = hoverMark !== null ? hoverMark : activeMark;
    if (focus !== null && focus >= FLOOR && focus <= MAX_MARK) {
      const pt = SERIES[focus - FLOOR];
      const fx = xForMark(pt.m, w);
      const fyL = yForRank(pt.likely, h);
      const fyW = yForRank(pt.worst, h);

      ctx.strokeStyle = cGuide;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(fx, PAD.top);
      ctx.lineTo(fx, h - PAD.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Worst marker
      ctx.beginPath();
      ctx.arc(fx, fyW, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = cWarn;
      ctx.fill();

      // Likely marker
      ctx.beginPath();
      ctx.arc(fx, fyL, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = cAccent;
      ctx.stroke();
    }
  }, [activeMark, canvasSize, hoverMark, isDark, xForMark, yForRank]);

  const pointerToMark = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return FLOOR;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const t = (px - PAD.left) / (rect.width - PAD.left - PAD.right);
    return Math.max(FLOOR, Math.min(MAX_MARK, Math.round(FLOOR + t * (MAX_MARK - FLOOR))));
  };

  const tooltipPoint = hoverMark !== null ? SERIES[hoverMark - FLOOR] : null;
  const tipX = tooltipPoint ? xForMark(tooltipPoint.m, canvasSize.width) : 0;
  const tipY = tooltipPoint ? yForRank(tooltipPoint.likely, canvasSize.height) : 0;
  const tipLeft = tipX + 144 > canvasSize.width ? Math.max(8, tipX - 144) : tipX + 12;
  const tipTop = Math.max(8, Math.min(canvasSize.height - 76, tipY - 24));

  return (
    <div
      ref={wrapRef}
      className="relative h-[280px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
    >
      <canvas
        ref={canvasRef}
        data-testid="rank-curve-canvas"
        aria-label="Interactive Nationwide Rank Curve from 470 to 600 marks"
        className="block h-full w-full cursor-crosshair"
        onPointerMove={(e) => setHoverMark(pointerToMark(e.clientX))}
        onPointerLeave={() => setHoverMark(null)}
        onClick={(e) => onSelectMark(pointerToMark(e.clientX))}
      />
      {tooltipPoint && (
        <div
          data-testid="curve-tooltip"
          style={{ left: `${tipLeft}px`, top: `${tipTop}px` }}
          className="font-mono-num pointer-events-none absolute z-10 rounded-lg border border-sky-500/70 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-lg dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="font-semibold">{tooltipPoint.m} / 600</div>
          <div className="text-sky-600 dark:text-sky-400">
            Likely: #{fmt(round10(tooltipPoint.likely))}
          </div>
          <div className="text-amber-600 dark:text-amber-400">
            Worst: #{fmt(round10(tooltipPoint.worst))}
          </div>
        </div>
      )}
    </div>
  );
};
