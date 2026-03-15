"use client";

import { useMemo } from "react";
import { useAppStore, type MarketDetail, type CountryData } from "@/lib/store";
import { getDomainColor, formatNumber, downloadCSV } from "@/lib/utils";

export interface CountryDetails {
  domains: Record<string, number>;
  markets: {
    id: string;
    title: string;
    created_at: string | null;
    active: boolean;
    closed: boolean;
    category: string | null;
    domain: string | null;
  }[];
}

interface CountryModalProps {
  country: CountryData;
  countryDetails: Record<string, CountryDetails> | null;
}

export default function CountryModal({ country, countryDetails }: CountryModalProps) {
  const { setSelectedCountry, setSelectedMarket } = useAppStore();

  const details = countryDetails?.[country.name];
  const markets = details?.markets || [];
  const domainBreakdown = useMemo(() => {
    if (!details?.domains) return [];
    return Object.entries(details.domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [details]);

  const maxCount = domainBreakdown.length > 0 ? domainBreakdown[0][1] : 1;
  const totalFromDomains = domainBreakdown.reduce((sum, [, c]) => sum + c, 0);

  return (
    <div className="modal-overlay" onClick={() => setSelectedCountry(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-1">
            <h2
              className="font-[var(--font-serif)] text-xl font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              {country.name}
            </h2>
            <button
              onClick={() => setSelectedCountry(null)}
              className="p-1 transition-colors"
              style={{ color: "var(--text-3)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--text-3)" }}>
            <span>{country.continent.replace(/_/g, " ")}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>{country.iso}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span style={{ color: "var(--text-1)" }} className="font-medium">
              {country.market_count.toLocaleString()} markets
            </span>
          </div>
        </div>

        {/* Domain breakdown — from full Neo4j data */}
        {domainBreakdown.length > 0 && (
          <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Domain Breakdown ({totalFromDomains.toLocaleString()} classified)
            </span>
            <div className="mt-3 space-y-2">
              {domainBreakdown.map(([domain, count]) => (
                <div key={domain} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getDomainColor(domain) }}
                  />
                  <span className="text-xs w-28 truncate" style={{ color: "var(--text-2)" }}>
                    {domain.replace(/_/g, " ")}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: getDomainColor(domain),
                        opacity: 0.5,
                      }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums w-10 text-right" style={{ color: "var(--text-3)" }}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Markets — sample from Neo4j */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Recent Markets ({markets.length} of {formatNumber(country.market_count)})
            </span>
            {markets.length > 0 && (
              <button
                onClick={() => {
                  downloadCSV(
                    markets.map((m) => ({
                      title: m.title,
                      domain: m.domain || "",
                      category: m.category || "",
                      status: m.active ? "Active" : "Closed",
                      created: m.created_at?.split("T")[0] || "",
                    })),
                    `${country.iso}_markets.csv`
                  );
                }}
                className="text-[10px] px-2 py-1 rounded border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
              >
                CSV
              </button>
            )}
          </div>
          <div className="space-y-px max-h-56 overflow-y-auto">
            {markets.length === 0 && (
              <p className="text-xs italic py-2" style={{ color: "var(--text-3)" }}>
                No markets found for this country.
              </p>
            )}
            {markets.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedCountry(null);
                  setSelectedMarket({
                    id: m.id,
                    title: m.title,
                    created_at: m.created_at,
                    active: m.active,
                    closed: m.closed,
                    category: m.category,
                    domain: m.domain,
                    countries: [country.name],
                    persons: [],
                  });
                }}
                className="w-full text-left px-2 py-1.5 rounded-md transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: getDomainColor(m.domain || "Other") }}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] truncate" style={{ color: "var(--text-2)" }}>
                      {m.title}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      {m.category?.replace(/_/g, " ") || "Uncategorized"}
                      {m.active ? " · Active" : ""}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Download summary — includes domain stats + all recent markets */}
        <div className="px-5 pb-5">
          <div className="h-px mb-3" style={{ background: "var(--border-subtle)" }} />
          <button
            onClick={() => {
              // Combine domain stats and all markets into one download
              const domainRows = domainBreakdown.map(([domain, count]) => ({
                country: country.name,
                type: "domain_stat",
                title: "",
                domain,
                category: "",
                status: "",
                created: "",
                market_count: count,
              }));
              const marketRows = markets.map((m) => ({
                country: country.name,
                type: "market",
                title: m.title,
                domain: m.domain || "",
                category: m.category || "",
                status: m.active ? "Active" : "Closed",
                created: m.created_at?.split("T")[0] || "",
                market_count: "",
              }));
              downloadCSV([...domainRows, ...marketRows], `${country.iso}_full_summary.csv`);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "var(--bg)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Full Summary
          </button>
        </div>
      </div>
    </div>
  );
}
