import { useState } from "react";

/**
 * Pure SVG Bar Chart (zero external dependencies)
 */
export function BarChart({ data = [], title, height = 220, color = "#3b82f6" }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
        No chart data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const chartHeight = height - 50;
  const barWidth = Math.max(16, Math.min(48, Math.floor(600 / (data.length * 1.5))));

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      {title && (
        <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)" }}>
          {title}
        </h4>
      )}
      <svg
        viewBox={`0 0 ${Math.max(500, data.length * 60)} ${height}`}
        style={{ width: "100%", height: `${height}px`, overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`bar-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = chartHeight * (1 - pct) + 15;
          return (
            <g key={idx}>
              <line
                x1="45"
                y1={y}
                x2={Math.max(480, data.length * 60)}
                y2={y}
                stroke="var(--border-color, #334155)"
                strokeDasharray="3,3"
                opacity="0.5"
              />
              <text x="40" y={y + 3} textAnchor="end" fontSize="10" fill="var(--text-muted, #94a3b8)">
                {Math.round(maxValue * pct).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, idx) => {
          const val = Number(d.value) || 0;
          const barH = (val / maxValue) * chartHeight;
          const x = 55 + idx * 55;
          const y = chartHeight - barH + 15;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barH)}
                rx="4"
                fill={isHovered ? "#60a5fa" : `url(#bar-grad-${color.replace("#", "")})`}
                transition="all 0.2s ease"
              />
              {/* Value label on hover or if bar is prominent */}
              {isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="var(--text-main, #f8fafc)"
                >
                  {val.toLocaleString()}
                </text>
              )}
              {/* Category label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 32}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted, #94a3b8)"
              >
                {String(d.label).length > 8 ? String(d.label).slice(0, 7) + "…" : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Pure SVG Donut Chart with Legend
 */
export function DonutChart({ data = [], title, size = 180 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
        No distribution data
      </div>
    );
  }

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const radius = size * 0.4;
  const strokeWidth = size * 0.16;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {title && (
        <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)" }}>
          {title}
        </h4>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.map((d, idx) => {
              const val = Number(d.value) || 0;
              const percent = total > 0 ? val / total : 0;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedPercent * circumference);
              accumulatedPercent += percent;
              const segmentColor = d.color || colors[idx % colors.length];

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={segmentColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                />
              );
            })}
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none"
            }}
          >
            <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)" }}>
              {total.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "180px" }}>
          {data.slice(0, 6).map((d, idx) => {
            const segmentColor = d.color || colors[idx % colors.length];
            const pct = total > 0 ? Math.round((Number(d.value) / total) * 100) : 0;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: segmentColor }} />
                <span style={{ color: "var(--text-muted)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.label}
                </span>
                <span style={{ fontWeight: "600", color: "var(--text-main)" }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
