"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore, type MarketDetail, type GraphData } from "@/lib/store";
import { getDomainColor, formatNumber, downloadCSV } from "@/lib/utils";

interface DetailPanelProps {
  topMarkets: MarketDetail[];
  graphData: GraphData | null;
}

interface SearchResult {
  results: MarketDetail[];
  total: number;
}

function useFullSearch(query: string) {
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setData(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=100`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // fall back to client-side
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { data, loading };
}

export default function DetailPanel({ topMarkets, graphData }: DetailPanelProps) {
  const {
    selectedMarket,
    setSelectedMarket,
    selectedNode,
    setSelectedNode,
    searchQuery,
  } = useAppStore();

  const { data: searchData, loading: searchLoading } = useFullSearch(searchQuery);
  const [exporting, setExporting] = useState(false);

  const exportFullSearch = useCallback(async (query: string, filename: string) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&export=1`);
      const json: SearchResult = await res.json();
      downloadCSV(
        json.results.map((m) => ({
          id: m.id,
          title: m.title,
          category: m.category,
          domain: m.domain,
          status: m.active ? "Active" : "Closed",
          created: m.created_at?.split("T")[0] || "",
        })),
        filename
      );
    } catch {
      // fallback: export what we have client-side
    } finally {
      setExporting(false);
    }
  }, []);

  // --- Node detail ---
  if (selectedNode && graphData) {
    const connectedLinks = graphData.links.filter(
      (l) => l.source === selectedNode.id || l.target === selectedNode.id
    );
    const connectedIds = connectedLinks.map((l) =>
      l.source === selectedNode.id ? l.target : l.source
    );
    const connectedNodes = graphData.nodes.filter((n) =>
      connectedIds.includes(n.id)
    );
    const semanticLinks = connectedLinks.filter((l) => l.type === "semantic");
    const domainLinks = connectedLinks.filter((l) => l.type !== "semantic");

    // Match by category/domain AND by title keyword for comprehensive results
    const nodeLabel = selectedNode.label.toLowerCase().replace(/_/g, " ");
    const allMatchingMarkets = topMarkets.filter(
      (m) =>
        m.category === selectedNode.id ||
        m.domain === selectedNode.id ||
        m.title.toLowerCase().includes(nodeLabel)
    );
    const categoryMarkets = allMatchingMarkets.slice(0, 30);

    return (
      <Panel>
        <div className="p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <BackButton onClick={() => setSelectedNode(null)} />
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: getDomainColor(selectedNode.domain) }}
            />
            <h3
              className="font-[var(--font-serif)] text-base font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              {selectedNode.label.replace(/_/g, " ")}
            </h3>
          </div>
          <div className="flex gap-4 mt-3">
            <MiniStat label="Markets" value={formatNumber(selectedNode.market_count)} />
            <MiniStat label="Domain" value={selectedNode.domain.replace(/_/g, " ")} />
            <MiniStat label="Links" value={String(connectedLinks.length)} />
          </div>
          <DownloadBtn
            label={exporting ? "Exporting..." : `Export All ${selectedNode.label.replace(/_/g, " ")} Markets`}
            disabled={exporting}
            onClick={() => {
              exportFullSearch(
                nodeLabel,
                `${selectedNode.id}_all_markets.csv`
              );
            }}
          />
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {semanticLinks.length > 0 && (
            <Section label="Semantic">
              {connectedNodes
                .filter((n) => semanticLinks.some((l) => l.source === n.id || l.target === n.id))
                .sort((a, b) => b.market_count - a.market_count)
                .map((n) => (
                  <NodeRow key={n.id} node={n} onClick={setSelectedNode} />
                ))}
            </Section>
          )}
          {domainLinks.length > 0 && (
            <Section label="Domain">
              {connectedNodes
                .filter((n) => domainLinks.some((l) => l.source === n.id || l.target === n.id))
                .sort((a, b) => b.market_count - a.market_count)
                .slice(0, 15)
                .map((n) => (
                  <NodeRow key={n.id} node={n} onClick={setSelectedNode} />
                ))}
            </Section>
          )}
          {categoryMarkets.length > 0 && (
            <Section label="Markets">
              {categoryMarkets.map((m) => (
                <MarketRow key={m.id} market={m} onClick={setSelectedMarket} />
              ))}
            </Section>
          )}
        </div>
      </Panel>
    );
  }

  // --- Market detail ---
  if (selectedMarket) {
    return (
      <Panel>
        <div className="p-4">
          <BackButton onClick={() => setSelectedMarket(null)} />
          <h3
            className="font-[var(--font-serif)] text-[14px] font-semibold leading-snug mb-4"
            style={{ color: "var(--text-1)" }}
          >
            {selectedMarket.title}
          </h3>
          <div className="space-y-2.5">
            <InfoRow
              label="Domain"
              value={selectedMarket.domain?.replace(/_/g, " ") || "\u2014"}
              dotColor={getDomainColor(selectedMarket.domain || "Other")}
            />
            <InfoRow label="Category" value={selectedMarket.category?.replace(/_/g, " ") || "\u2014"} />
            <InfoRow
              label="Status"
              value={selectedMarket.active ? "Active" : selectedMarket.closed ? "Closed" : "\u2014"}
              valueColor={selectedMarket.active ? "#2B8C5A" : undefined}
            />
            <InfoRow label="Created" value={selectedMarket.created_at?.split("T")[0] || "\u2014"} />
            {selectedMarket.countries.length > 0 && (
              <InfoRow label="Countries" value={selectedMarket.countries.join(", ")} />
            )}
            {selectedMarket.persons.length > 0 && (
              <InfoRow label="People" value={selectedMarket.persons.join(", ")} />
            )}
          </div>
          <DownloadBtn
            onClick={() => {
              downloadCSV(
                [{
                  id: selectedMarket.id,
                  title: selectedMarket.title,
                  domain: selectedMarket.domain,
                  category: selectedMarket.category,
                  status: selectedMarket.active ? "Active" : "Closed",
                  created: selectedMarket.created_at,
                  countries: selectedMarket.countries.join("; "),
                  persons: selectedMarket.persons.join("; "),
                }],
                `market_${selectedMarket.id}.csv`
              );
            }}
          />
        </div>
      </Panel>
    );
  }

  // --- Market list with full-database search ---
  const clientFiltered = searchQuery
    ? topMarkets.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topMarkets.slice(0, 60);

  // Use full-database results when available, otherwise fall back to client-side
  const displayMarkets = searchQuery && searchData ? searchData.results : clientFiltered;
  const totalCount = searchQuery && searchData ? searchData.total : clientFiltered.length;

  return (
    <Panel>
      <div className="p-4 pb-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.12em]"
            style={{ color: "var(--text-3)" }}
          >
            {searchQuery ? "Search Results" : "Recent Markets"}
          </span>
          {searchQuery && (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              {searchLoading ? "Searching..." : `${formatNumber(totalCount)} total`}
            </span>
          )}
        </div>
        {searchQuery && totalCount > displayMarkets.length && (
          <div className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
            Showing {displayMarkets.length} of {formatNumber(totalCount)}
          </div>
        )}
        <DownloadBtn
          label={
            exporting
              ? "Exporting..."
              : searchQuery
                ? `Export All ${formatNumber(totalCount)} Results`
                : "Export CSV"
          }
          disabled={exporting}
          onClick={() => {
            if (searchQuery) {
              exportFullSearch(
                searchQuery,
                `${searchQuery.replace(/\s+/g, "_")}_all_markets.csv`
              );
            } else {
              downloadCSV(
                clientFiltered.map((m) => ({
                  id: m.id,
                  title: m.title,
                  domain: m.domain,
                  category: m.category,
                  status: m.active ? "Active" : "Closed",
                  created: m.created_at?.split("T")[0] || "",
                })),
                "markets_export.csv"
              );
            }
          }}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {displayMarkets.map((m) => (
          <MarketRow key={m.id} market={m} onClick={setSelectedMarket} />
        ))}
      </div>
    </Panel>
  );
}

/* ── Sub-components ── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border-l flex flex-col h-full overflow-y-auto"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] transition-colors mb-3 flex items-center gap-1"
      style={{ color: "var(--text-3)" }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <span
        className="text-[10px] font-medium uppercase tracking-[0.12em]"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </span>
      <div className="mt-1.5 space-y-px">{children}</div>
    </div>
  );
}

function NodeRow({
  node,
  onClick,
}: {
  node: { id: string; label: string; domain: string; market_count: number };
  onClick: (n: { id: string; label: string; domain: string; market_count: number }) => void;
}) {
  return (
    <button
      onClick={() => onClick(node)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors"
      style={{ color: "var(--text-2)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: getDomainColor(node.domain) }}
      />
      <span className="text-xs flex-1 text-left truncate">
        {node.label.replace(/_/g, " ")}
      </span>
      <span className="text-[10px] tabular-nums" style={{ color: "var(--text-3)" }}>
        {formatNumber(node.market_count)}
      </span>
    </button>
  );
}

function MarketRow({
  market,
  onClick,
}: {
  market: MarketDetail;
  onClick: (m: MarketDetail) => void;
}) {
  return (
    <button
      onClick={() => onClick(market)}
      className="w-full text-left px-3 py-2 rounded-md transition-colors group"
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex items-start gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: getDomainColor(market.domain || "Other") }}
        />
        <div className="min-w-0">
          <div className="text-[11px] truncate" style={{ color: "var(--text-2)" }}>
            {market.title}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {market.category?.replace(/_/g, " ") || "Uncategorized"}
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium tabular-nums" style={{ color: "var(--text-1)" }}>
        {value}
      </div>
      <div className="text-[9px] mt-0.5" style={{ color: "var(--text-3)" }}>
        {label}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  dotColor,
  valueColor,
}: {
  label: string;
  value: string;
  dotColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</span>
      <div className="flex items-center gap-1.5">
        {dotColor && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        )}
        <span
          className="text-[11px] text-right font-medium"
          style={{ color: valueColor || "var(--text-1)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function DownloadBtn({ onClick, label, disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] border transition-colors"
      style={{
        borderColor: "var(--border)",
        color: disabled ? "var(--text-3)" : "var(--text-3)",
        background: "var(--bg)",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "wait" : "pointer",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = "var(--text-1)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.color = "var(--text-3)"; }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      {label || "Export CSV"}
    </button>
  );
}
