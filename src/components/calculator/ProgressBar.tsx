interface Props {
  huidigeStap: number; // 1-gebaseerd
  totaalStappen: number;
}

export default function ProgressBar({ huidigeStap, totaalStappen }: Props) {
  const pct = Math.round((huidigeStap / totaalStappen) * 100);
  return (
    <div className="mb-6">
      <div className="mb-1 flex justify-between text-sm text-slate-500">
        <span>
          Stap {huidigeStap} van {totaalStappen}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
