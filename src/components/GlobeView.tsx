"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { CountryData, GlobeArc } from "@/lib/store";
import { useAppStore } from "@/lib/store";
import { canUseWebGL, formatNumber } from "@/lib/utils";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface GlobeViewProps {
  countries: CountryData[];
  arcs: GlobeArc[];
}

export default function GlobeView({ countries, arcs }: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [globeReady, setGlobeReady] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const { setSelectedCountry, theme } = useAppStore();

  const isDark = theme === "dark";

  useEffect(() => {
    setWebglAvailable(canUseWebGL());
  }, []);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    measure();
    window.addEventListener("resize", measure);
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (globeRef.current && globeReady) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.3;
      globeRef.current.pointOfView({ lat: 25, lng: -30, altitude: 2.2 }, 1500);
    }
  }, [globeReady]);

  const pointColor = isDark ? "rgba(120, 160, 255, 0.85)" : "rgba(140, 100, 50, 0.8)";

  const pointsData = useMemo(() => {
    return countries
      .filter((c) => c.market_count > 0)
      .map((c) => ({
        lat: c.lat,
        lng: c.lng,
        size: Math.max(0.4, Math.sqrt(c.market_count) * 0.025),
        color: pointColor,
        name: c.name,
        iso: c.iso,
        continent: c.continent,
        market_count: c.market_count,
      }));
  }, [countries, pointColor]);

  const arcsData = useMemo(() => {
    const maxStrength = Math.max(...arcs.map((a) => a.strength), 1);
    return arcs.map((a) => {
      const norm = a.strength / maxStrength;
      const alpha = 0.05 + norm * 0.1;
      return {
        startLat: a.srcLat,
        startLng: a.srcLng,
        endLat: a.tgtLat,
        endLng: a.tgtLng,
        color: isDark
          ? [`rgba(100, 140, 255, ${alpha})`, `rgba(160, 120, 255, ${alpha})`]
          : [`rgba(140, 110, 70, ${alpha})`, `rgba(120, 90, 50, ${alpha})`],
        stroke: 0.12 + norm * 0.3,
      };
    });
  }, [arcs, isDark]);

  const handlePointClick = useCallback(
    (point: any) => {
      const country = countries.find((c) => c.name === point.name);
      if (country) {
        setSelectedCountry(country);
        if (globeRef.current) {
          globeRef.current.pointOfView(
            { lat: country.lat, lng: country.lng, altitude: 1.8 },
            1000
          );
        }
      }
    },
    [countries, setSelectedCountry]
  );

  if (countries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span
          className="font-[var(--font-serif)] text-lg italic"
          style={{ color: "var(--text-3)" }}
        >
          Loading...
        </span>
      </div>
    );
  }

  if (webglAvailable === false) {
    const rankedCountries = [...countries]
      .filter((country) => country.market_count > 0)
      .sort((a, b) => b.market_count - a.market_count)
      .slice(0, 8);
    const coveredCountries = countries.filter((country) => country.market_count > 0);
    const continents = new Set(
      coveredCountries.map((country) => country.continent.replace(/_/g, " "))
    );
    const maxCountry = rankedCountries[0];

    return (
      <div
        className="h-full px-10 py-8 flex items-center"
        style={{
          background:
            isDark
              ? "radial-gradient(circle at 20% 20%, rgba(88, 120, 255, 0.14), transparent 28%), radial-gradient(circle at 80% 10%, rgba(130, 70, 255, 0.12), transparent 24%), linear-gradient(135deg, #0f172a 0%, #111c32 100%)"
              : "radial-gradient(circle at 18% 18%, rgba(198, 162, 102, 0.18), transparent 24%), radial-gradient(circle at 82% 12%, rgba(95, 120, 165, 0.12), transparent 20%), linear-gradient(135deg, #f4f3f1 0%, #fbfaf7 100%)",
        }}
      >
        <div className="grid grid-cols-[1.3fr_0.9fr] gap-8 w-full">
          <div
            className="rounded-[28px] border p-8 overflow-hidden relative"
            style={{
              background: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.82)",
              borderColor: "var(--border)",
              boxShadow: "0 24px 80px var(--tooltip-shadow)",
            }}
          >
            <div className="relative z-10 max-w-xl">
              <span
                className="text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "var(--text-3)" }}
              >
                Global Footprint
              </span>
              <h2
                className="mt-4 font-[var(--font-serif)] text-4xl leading-none"
                style={{ color: "var(--text-1)" }}
              >
                Prediction markets cluster around macro hotspots before they
                ever show up in a spreadsheet.
              </h2>
              <p
                className="mt-4 text-sm leading-6 max-w-lg"
                style={{ color: "var(--text-2)" }}
              >
                WebGL is unavailable in this environment, so the interactive
                globe drops into a static briefing view with the same country
                coverage data and cross-border link counts.
              </p>
            </div>

            <div className="relative z-10 mt-8 grid grid-cols-3 gap-3 max-w-2xl">
              <FallbackStat
                label="Countries"
                value={formatNumber(coveredCountries.length)}
              />
              <FallbackStat
                label="Cross-Border Links"
                value={formatNumber(arcs.length)}
              />
              <FallbackStat
                label="Continents"
                value={formatNumber(continents.size)}
              />
            </div>

            {maxCountry && (
              <div
                className="relative z-10 mt-8 inline-flex items-center gap-3 rounded-full px-4 py-2 border"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: pointColor }}
                />
                <span className="text-xs" style={{ color: "var(--text-2)" }}>
                  Highest density:
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                  {maxCountry.name}
                </span>
                <span className="text-xs tabular-nums" style={{ color: "var(--text-3)" }}>
                  {formatNumber(maxCountry.market_count)} markets
                </span>
              </div>
            )}

            <div
              className="absolute right-[-4%] top-1/2 -translate-y-1/2 w-[46%] aspect-square rounded-full"
              style={{
                background:
                  isDark
                    ? "radial-gradient(circle at 35% 35%, rgba(110, 155, 255, 0.6), rgba(62, 97, 191, 0.18) 45%, rgba(15, 23, 42, 0.02) 72%)"
                    : "radial-gradient(circle at 35% 35%, rgba(173, 138, 81, 0.45), rgba(101, 129, 171, 0.12) 46%, rgba(255, 255, 255, 0.02) 72%)",
                filter: "blur(4px)",
              }}
            />
          </div>

          <div
            className="rounded-[28px] border p-6"
            style={{
              background: isDark ? "rgba(15, 23, 42, 0.78)" : "rgba(255, 255, 255, 0.88)",
              borderColor: "var(--border)",
              boxShadow: "0 24px 80px var(--tooltip-shadow)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "var(--text-3)" }}
              >
                Top Countries
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                Market mentions
              </span>
            </div>
            <div className="space-y-3">
              {rankedCountries.map((country, index) => (
                <div key={country.iso}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 text-[11px] tabular-nums"
                        style={{ color: "var(--text-3)" }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span style={{ color: "var(--text-1)" }}>{country.name}</span>
                    </div>
                    <span className="tabular-nums" style={{ color: "var(--text-2)" }}>
                      {formatNumber(country.market_count)}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(country.market_count / (maxCountry?.market_count || 1)) * 100}%`,
                        background: pointColor,
                        opacity: 0.75,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tooltipBg = isDark ? "rgba(17,17,20,0.92)" : "white";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "#E8E8E6";
  const tooltipText = isDark ? "#E4E4E4" : "#1A1A1A";
  const tooltipMuted = isDark ? "#8A8A8A" : "#6B6B6B";

  return (
    <div ref={containerRef} className="w-full h-full">
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        onGlobeReady={() => setGlobeReady(true)}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor={isDark ? "#0f172a" : "#F4F3F1"}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(d: any) => d.size * 0.3}
        pointRadius={(d: any) => d.size}
        pointColor="color"
        pointLabel={(d: any) =>
          `<div style="text-align:center;font-family:Georgia,serif;font-size:13px;color:${tooltipText};background:${tooltipBg};padding:8px 14px;border-radius:8px;border:1px solid ${tooltipBorder};box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="font-weight:600;">${d.name}</div>
            <div style="color:${tooltipMuted};font-family:-apple-system,sans-serif;font-size:11px;margin-top:3px;">${d.market_count.toLocaleString()} markets</div>
            <div style="color:${tooltipMuted};font-family:-apple-system,sans-serif;font-size:10px;margin-top:2px;opacity:0.6;">Click for details</div>
          </div>`
        }
        onPointClick={handlePointClick}
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke="stroke"
        arcDashLength={0.6}
        arcDashGap={0.3}
        arcDashAnimateTime={2500}
        atmosphereColor={isDark ? "rgba(100, 130, 180, 0.2)" : "rgba(140, 120, 90, 0.25)"}
        atmosphereAltitude={0.18}
      />
    </div>
  );
}

function FallbackStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        background: "var(--bg)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="font-[var(--font-serif)] text-2xl tabular-nums"
        style={{ color: "var(--text-1)" }}
      >
        {value}
      </div>
      <div className="text-[10px] mt-1 uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
        {label}
      </div>
    </div>
  );
}
