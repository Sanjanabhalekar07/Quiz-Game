"use client";

import { useEffect, useState } from "react";

type Range = "7d" | "30d" | "3m" | "1y";
type Point = { key: string; users: number; games: number };
type AnalyticsData = { points?: Point[]; error?: string };

const ranges: Array<{ value: Range; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "1y", label: "1 year" },
];

const width = 900;
const height = 300;
const padding = { top: 20, right: 22, bottom: 46, left: 48 };
const chartWidth = width - padding.left - padding.right;
const chartHeight = height - padding.top - padding.bottom;

export function AdminAnalyticsChart() {
  const [range, setRange] = useState<Range>("7d");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void fetch(`/api/admin/analytics?range=${range}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as AnalyticsData;
        if (!response.ok) throw new Error(data.error ?? "Could not load dashboard analytics.");
        if (active) setPoints(data.points ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load dashboard analytics.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [range]);

  const maxValue = Math.max(1, ...points.flatMap((point) => [point.users, point.games]));
  const ceiling = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const x = (index: number) => padding.left + (points.length <= 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
  const y = (value: number) => padding.top + chartHeight - (value / ceiling) * chartHeight;
  const userPath = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.users)}`).join(" ");
  const gamePath = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.games)}`).join(" ");
  const xLabelStep = range === "7d" || range === "1y" ? 1 : range === "30d" ? 5 : 15;
  const xLabelIndices = points.map((_, index) => index).filter((index) => index % xLabelStep === 0 || index === points.length - 1);
  const labelDate = (key: string) => {
    const [yearPart, monthPart, dayPart] = key.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = dayPart ? Number(dayPart) : 1;
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return key;
    }
    const date = new Date(Date.UTC(year, month - 1, day, 6, 30));
    return new Intl.DateTimeFormat(undefined, range === "7d"
      ? { month: "short", day: "numeric", timeZone: "Asia/Kolkata" }
      : { month: "short", ...(range === "1y" ? {} : { day: "numeric" }), timeZone: "Asia/Kolkata" },
    ).format(date);
  };

  return (
    <section className="admin-analytics-card" aria-labelledby="admin-analytics-title">
      <div className="admin-analytics-header">
        <div>
          <p className="admin-eyebrow">ACTIVITY OVER TIME</p>
          <h2 id="admin-analytics-title">Registrations &amp; games</h2>
          <p>New accounts and completed quiz rounds</p>
        </div>
        <div className="admin-analytics-ranges" role="group" aria-label="Chart date range">
          {ranges.map((item) => (
            <button
              aria-pressed={range === item.value}
              className={range === item.value ? "active" : ""}
              key={item.value}
              onClick={() => setRange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-chart-legend" aria-label="Chart legend">
        <span><i className="admin-chart-key users" /> Registered users</span>
        <span><i className="admin-chart-key games" /> Games played</span>
      </div>
      {error ? <p className="admin-table-error" role="alert">{error}</p> : null}
      {loading ? <p className="admin-chart-message" role="status">Loading activity…</p> : null}
      {!loading && !error ? (
        <div className="admin-chart-scroll">
          <svg className="admin-activity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Registered users and games played over the last ${ranges.find((item) => item.value === range)?.label}`}>
            {[0, 1, 2, 3, 4].map((tick) => {
              const value = (ceiling / 4) * tick;
              const tickY = y(value);
              return (
                <g key={tick}>
                  <line className="admin-chart-grid-line" x1={padding.left} x2={width - padding.right} y1={tickY} y2={tickY} />
                  <text className="admin-chart-y-label" x={padding.left - 10} y={tickY + 4} textAnchor="end">{Math.round(value)}</text>
                </g>
              );
            })}
            {points.length ? (
              <>
                <path className="admin-chart-area users" d={`${userPath} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} />
                <path className="admin-chart-area games" d={`${gamePath} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} />
                <path className="admin-chart-line users" d={userPath} />
                <path className="admin-chart-line games" d={gamePath} />
                {points.map((point, index) => (
                  <g key={point.key}>
                    <circle className="admin-chart-point users" cx={x(index)} cy={y(point.users)} r="2.5">
                      <title>{`${labelDate(point.key)}: ${point.users} registered users`}</title>
                    </circle>
                    <circle className="admin-chart-point games" cx={x(index)} cy={y(point.games)} r="2.5">
                      <title>{`${labelDate(point.key)}: ${point.games} games played`}</title>
                    </circle>
                  </g>
                ))}
                {xLabelIndices.map((index) => (
                  <text className="admin-chart-x-label" key={points[index].key} x={x(index)} y={height - 14} textAnchor="middle">
                    {labelDate(points[index].key)}
                  </text>
                ))}
              </>
            ) : null}
          </svg>
        </div>
      ) : null}
    </section>
  );
}
