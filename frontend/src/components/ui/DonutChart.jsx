/**
 * Pure-SVG donut chart — zero external dependencies.
 * Each segment is an SVG circle with a strokeDasharray slice.
 *
 * Props:
 *   segments  – [{ label, value, color }]
 *   size      – diameter in px (default 160)
 *   thickness – stroke width in px (default 28)
 *   label     – big centre text (e.g. "75%")
 *   subLabel  – small centre text (e.g. "Occupied")
 */
const DonutChart = ({ segments = [], size = 160, thickness = 28, label, subLabel }) => {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const total = segments.reduce((acc, s) => acc + (s.value || 0), 0);

  // Gap between segments (in px along circumference)
  const gap = total > 1 ? Math.min(circ * 0.012, 3) : 0;

  let cumAngle = -90; // start at 12 o'clock

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
        ) : (
          segments.map((seg, i) => {
            if (!seg.value) return null;
            const fraction = seg.value / total;
            const dashLen = Math.max(0, fraction * circ - gap);
            const startAngle = cumAngle;
            cumAngle += fraction * 360;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dashLen} ${circ - dashLen}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
                transform={`rotate(${startAngle}, ${cx}, ${cy})`}
              />
            );
          })
        )}
      </svg>

      {/* Centre label */}
      {(label || subLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {label && <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{label}</span>}
          {subLabel && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight mt-0.5">{subLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default DonutChart;
