"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DetailPanel from "@/components/DetailPanel";
import TimelineChart from "@/components/TimelineChart";
import GalaxyGraph from "@/components/GalaxyGraph";
import GlobeView from "@/components/GlobeView";
import CountryModal, { type CountryDetails } from "@/components/CountryModal";
import { useAppStore } from "@/lib/store";
import type {
  DomainStat,
  CountryData,
  GlobeArc,
  TimelineEntry,
  GraphData,
  MarketDetail,
} from "@/lib/store";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  return res.json();
}

export default function Home() {
  const { viewMode, selectedDomains, searchQuery, selectedCountry, theme } =
    useAppStore();

  const [domainStats, setDomainStats] = useState<DomainStat[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [arcs, setArcs] = useState<GlobeArc[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [topMarkets, setTopMarkets] = useState<MarketDetail[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [countryDetails, setCountryDetails] = useState<Record<string, CountryDetails> | null>(null);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    Promise.all([
      fetchJSON<DomainStat[]>("/data/domain_stats.json"),
      fetchJSON<CountryData[]>("/data/countries.json"),
      fetchJSON<GlobeArc[]>("/data/globe_arcs.json"),
      fetchJSON<TimelineEntry[]>("/data/timeline.json"),
      fetchJSON<GraphData>("/data/graph_categories.json"),
      fetchJSON<MarketDetail[]>("/data/top_markets.json"),
      fetchJSON<Record<string, number>>("/data/stats.json"),
      fetchJSON<Record<string, CountryDetails>>("/data/country_details.json"),
    ]).then(([ds, co, ar, tl, gd, tm, st, cd]) => {
      setDomainStats(ds);
      setCountries(co);
      setArcs(ar);
      setTimeline(tl);
      setGraphData(gd);
      setTopMarkets(tm);
      setStats(st);
      setCountryDetails(cd);
    });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      <Header totalMarkets={stats?.total_markets || 0} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar domainStats={domainStats} stats={stats} />

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 relative overflow-hidden min-h-0" style={{ minHeight: 200 }}>
            {viewMode === "galaxy" && (
              <GalaxyGraph
                data={graphData}
                selectedDomains={selectedDomains}
                searchQuery={searchQuery}
              />
            )}
            {viewMode === "globe" && (
              <GlobeView countries={countries} arcs={arcs} />
            )}
          </div>
          <TimelineChart data={timeline} />
        </div>

        <div className="w-72">
          <DetailPanel topMarkets={topMarkets} graphData={graphData} />
        </div>
      </div>

      {selectedCountry && (
        <CountryModal
          country={selectedCountry}
          countryDetails={countryDetails}
        />
      )}
    </div>
  );
}
