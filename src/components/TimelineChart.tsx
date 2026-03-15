"use client";

import { useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Brush,
} from "recharts";
import { DOMAIN_COLORS, formatNumber, getDomainColor } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { TimelineEntry } from "@/lib/store";

interface TimelineChartProps {
  data: TimelineEntry[];
  onExpandChange?: (expanded: boolean) => void;
}

const STACKED_DOMAINS = [
  "Sports",
  "Crypto",
  "US_Politics",
  "Esports",
  "Economics",
  "Weather",
  "Geopolitics",
  "Other",
];

export default function TimelineChart({ data, onExpandChange }: TimelineChartProps) {
  const { theme } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<TimelineEntry | null>(null);

  const toggleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
    if (expanded) setSelectedMonth(null);
  }, [expanded, onExpandChange]);

  const handleChartClick = useCallback(
    (payload: any) => {
      if (payload?.activePayload?.[0]?.payload) {
        const entry = payload.activePayload[0].payload as TimelineEntry;
        setSelectedMonth((prev) =>
          prev?.month === entry.month ? null : entry
        );
      }
    },
    []
  );

  if (!data || data.length === 0) return null;

  const isDark = theme === "dark";
  const tickColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";
  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";

  // Get domain breakdown for selected month
  const monthDomains = selectedMonth
    ? STACKED_DOMAINS.filter(
        (d) => typeof selectedMonth[d] === "number" && (selectedMonth[d] as number) > 0
      )
        .map((d) => ({ domain: d, count: selectedMonth[d] as number }))
        .sort((a, b) => b.count - a.count)
    : [];

  const totalMonthMarkets = selectedMonth
    ? Number(selectedMonth.total || 0)
    : 0;

  return (
    <div
      className="border-t transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        flex: expanded ? "1.5 1 0%" : "0 0 100px",
        minHeight: expanded ? 360 : 100,
      }}
    >
      {/* Header bar */}
      <div
        className="px-5 pt-3 pb-2 flex items-center justify-between cursor-pointer select-none"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.12em] flex items-center gap-1.5"
            style={{ color: "var(--text-3)" }}
          >
            Market Creation
            <svg
              className="transition-transform duration-500"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </span>
          {selectedMonth && expanded && (
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-md animate-in"
              style={{
                background: "var(--hover)",
                color: "var(--text-1)",
                border: "1px solid var(--border)",
              }}
            >
              {selectedMonth.month} · {totalMonthMarkets.toLocaleString()} markets
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMonth(null);
                }}
                className="ml-2 hover:opacity-70"
                style={{ color: "var(--text-3)" }}
              >
                ×
              </button>
            </span>
          )}
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          {STACKED_DOMAINS.slice(0, expanded ? 8 : 4).map((d) => (
            <div key={d} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: DOMAIN_COLORS[d] || "#999" }}
              />
              <span className="text-[9px]" style={{ color: "var(--text-3)" }}>
                {d.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area — fills remaining space */}
      <div className="flex-1 px-5 pb-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} onClick={handleChartClick} style={{ cursor: expanded ? "crosshair" : "pointer" }}>
            {expanded && (
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            )}
            <XAxis
              dataKey="month"
              tick={{ fontSize: expanded ? 11 : 9, fill: tickColor }}
              interval={expanded ? Math.floor(data.length / 14) : Math.floor(data.length / 6)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: expanded ? 11 : 9, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatNumber}
              width={expanded ? 48 : 32}
            />
            <Tooltip
              contentStyle={{
                background: "var(--tooltip-bg)",
                border: "1px solid var(--tooltip-border)",
                borderRadius: "8px",
                fontSize: expanded ? "12px" : "11px",
                boxShadow: "0 4px 16px var(--tooltip-shadow)",
                padding: expanded ? "10px 16px" : "8px 12px",
              }}
              labelStyle={{ color: "var(--text-1)", marginBottom: 4, fontWeight: 600, fontSize: expanded ? "13px" : "11px" }}
              itemStyle={{ color: "var(--text-2)", padding: "1px 0" }}
              formatter={(value: any, name: string) => [
                Number(value).toLocaleString(),
                name.replace(/_/g, " "),
              ]}
            />
            {expanded && (
              <Brush
                dataKey="month"
                height={24}
                stroke="var(--border)"
                fill="var(--bg)"
                travellerWidth={10}
              />
            )}
            {STACKED_DOMAINS.map((domain) => (
              <Area
                key={domain}
                type="monotone"
                dataKey={domain}
                stackId="1"
                stroke={DOMAIN_COLORS[domain] || "#999"}
                fill={DOMAIN_COLORS[domain] || "#999"}
                fillOpacity={isDark ? (expanded ? 0.3 : 0.2) : (expanded ? 0.2 : 0.12)}
                strokeWidth={expanded ? 1.8 : 1}
                strokeOpacity={expanded ? 0.7 : 0.5}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Selected month domain breakdown chips */}
      {selectedMonth && expanded && monthDomains.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto py-1">
            {monthDomains.map(({ domain, count }) => (
              <div
                key={domain}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0 transition-all duration-200"
                style={{
                  borderColor: getDomainColor(domain) + "40",
                  background: getDomainColor(domain) + "08",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getDomainColor(domain) }}
                />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>
                  {domain.replace(/_/g, " ")}
                </span>
                <span
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: "var(--text-1)" }}
                >
                  {formatNumber(count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
