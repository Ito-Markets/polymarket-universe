"use client";

import { useState } from "react";
import { useAppStore, type DomainStat, type ViewMode } from "@/lib/store";
import { getDomainColor, formatNumber } from "@/lib/utils";

interface SidebarProps {
  domainStats: DomainStat[];
  stats: Record<string, number> | null;
}

const STAT_INFO: Record<string, { description: string; detail: string }> = {
  Markets: {
    description: "Total prediction markets",
    detail: "All markets ever created on Polymarket, including active, closed, and resolved markets across every category.",
  },
  Events: {
    description: "Unique event groups",
    detail: "Markets are grouped into events (e.g. all NBA game props for one match). Each event can contain multiple related markets.",
  },
  Active: {
    description: "Currently trading",
    detail: "Markets that are currently open for trading. Users can buy and sell shares in these markets right now.",
  },
  Closed: {
    description: "Resolved or expired",
    detail: "Markets that have been resolved with a final outcome or have expired past their end date.",
  },
};

export default function Sidebar({ domainStats, stats }: SidebarProps) {
  const {
    viewMode,
    setViewMode,
    selectedDomains,
    toggleDomain,
    setSelectedDomains,
  } = useAppStore();
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);

  const domainAgg = domainStats.reduce(
    (acc, s) => {
      acc[s.domain] = (acc[s.domain] || 0) + s.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedDomains = Object.entries(domainAgg).sort((a, b) => b[1] - a[1]);
  const totalCount = Object.values(domainAgg).reduce((a, b) => a + b, 0);

  const views: { mode: ViewMode; label: string }[] = [
    { mode: "galaxy", label: "Graph" },
    { mode: "globe", label: "Globe" },
  ];

  return (
    <div
      className="w-56 flex flex-col overflow-y-auto border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* View toggle */}
      <div className="p-4 pb-3">
        <div
          className="flex rounded-md p-0.5"
          style={{ background: "var(--bg)", border: "1px solid var(--border-subtle)" }}
        >
          {views.map((v) => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={
                viewMode === v.mode
                  ? {
                      background: "var(--surface)",
                      color: "var(--text-1)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      border: "1px solid var(--border)",
                    }
                  : { color: "var(--text-3)" }
              }
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Markets", value: formatNumber(stats.total_markets) },
              { label: "Events", value: formatNumber(stats.total_events) },
              { label: "Active", value: formatNumber(stats.active_markets) },
              { label: "Closed", value: formatNumber(stats.closed_markets) },
            ].map((s) => (
              <div
                key={s.label}
                className="relative rounded-md px-3 py-2 border cursor-pointer transition-all"
                style={{
                  borderColor: hoveredStat === s.label ? "var(--border)" : "var(--border-subtle)",
                  background: hoveredStat === s.label ? "var(--hover)" : "var(--bg)",
                }}
                onMouseEnter={() => setHoveredStat(s.label)}
                onMouseLeave={() => setHoveredStat(null)}
                onClick={() => setHoveredStat(hoveredStat === s.label ? null : s.label)}
              >
                <div
                  className="font-[var(--font-serif)] text-lg font-semibold tabular-nums"
                  style={{ color: "var(--text-1)" }}
                >
                  {s.value}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {s.label}
                </div>
                {/* Tooltip popup */}
                {hoveredStat === s.label && STAT_INFO[s.label] && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 w-52 rounded-lg p-3 border shadow-lg"
                    style={{
                      background: "var(--tooltip-bg)",
                      borderColor: "var(--tooltip-border)",
                      boxShadow: "0 8px 24px var(--tooltip-shadow)",
                    }}
                  >
                    <div className="text-[11px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
                      {STAT_INFO[s.label].description}
                    </div>
                    <div className="text-[10px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {STAT_INFO[s.label].detail}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="mx-4 h-px" style={{ background: "var(--border)" }} />

      {/* Domains */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.12em]"
            style={{ color: "var(--text-3)" }}
          >
            Domains
          </span>
          {selectedDomains.length > 0 && (
            <button
              onClick={() => setSelectedDomains([])}
              className="text-[10px] transition-colors"
              style={{ color: "var(--text-3)" }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-px">
          {sortedDomains.map(([domain, count]) => {
            const isActive =
              selectedDomains.length === 0 || selectedDomains.includes(domain);
            const pct = ((count / totalCount) * 100).toFixed(1);
            return (
              <div key={domain} className="relative">
                <button
                  onClick={() => toggleDomain(domain)}
                  onMouseEnter={() => setHoveredDomain(domain)}
                  onMouseLeave={() => setHoveredDomain(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all"
                  style={{
                    color: isActive ? "var(--text-1)" : "var(--text-3)",
                    background: "transparent",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                    style={{
                      backgroundColor: getDomainColor(domain),
                      opacity: isActive ? 1 : 0.25,
                    }}
                  />
                  <span className="flex-1 text-left truncate">
                    {domain.replace(/_/g, " ")}
                  </span>
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--text-3)" }}
                  >
                    {pct}%
                  </span>
                </button>
                {/* Domain hover tooltip */}
                {hoveredDomain === domain && (
                  <div
                    className="absolute left-full ml-2 top-0 z-50 w-48 rounded-lg p-3 border shadow-lg pointer-events-none"
                    style={{
                      background: "var(--tooltip-bg)",
                      borderColor: "var(--tooltip-border)",
                      boxShadow: "0 8px 24px var(--tooltip-shadow)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getDomainColor(domain) }}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>
                        {domain.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-[10px] tabular-nums" style={{ color: "var(--text-2)" }}>
                      {count.toLocaleString()} markets ({pct}%)
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                      Click to {isActive && selectedDomains.length > 0 ? "deselect" : "filter by"} this domain
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
