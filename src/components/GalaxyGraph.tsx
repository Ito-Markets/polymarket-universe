"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { canUseWebGL, formatNumber, getDomainColor } from "@/lib/utils";
import { useAppStore, type GraphData } from "@/lib/store";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

interface GalaxyGraphProps {
  data: GraphData | null;
  selectedDomains: string[];
  searchQuery: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export default function GalaxyGraph({
  data,
  selectedDomains,
  searchQuery,
}: GalaxyGraphProps) {
  const fgRef = useRef<any>(null);
  const shouldFrameRef = useRef(false);
  const { setSelectedNode, theme } = useAppStore();
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    setWebglAvailable(canUseWebGL());
  }, []);

  useEffect(() => {
    if (!data) return;

    const domainOrder = [...new Set(data.nodes.map((node) => node.domain))].sort();
    const domainAngle = new Map(
      domainOrder.map((domain, index) => [
        domain,
        (index / Math.max(domainOrder.length, 1)) * Math.PI * 2,
      ])
    );

    let nodes = data.nodes.map((n) => ({
      ...(() => {
        const angle = domainAngle.get(n.domain) ?? 0;
        const seed = hashString(n.id);
        const jitterAngle = ((seed % 360) / 360) * Math.PI * 2;
        const jitterRadius = 8 + ((seed >> 4) % 34);
        const clusterRadius = 170 + Math.log2(n.market_count + 1) * 8;
        const x = Math.cos(angle) * clusterRadius + Math.cos(jitterAngle) * jitterRadius;
        const y =
          Math.sin(angle) * clusterRadius * 0.72 +
          Math.sin(jitterAngle) * jitterRadius;
        const z =
          Math.sin(angle * 2) * 28 +
          (((seed >> 9) % 120) - 60) * 0.45;

        return { x, y, z };
      })(),
      id: n.id,
      name: n.label,
      domain: n.domain,
      val: Math.pow(Math.log2(n.market_count + 1), 1.5) * 1.5,
      color: getDomainColor(n.domain),
      market_count: n.market_count,
    }));

    let links = data.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.weight,
      linkType: l.type || "domain",
    }));

    if (selectedDomains.length > 0) {
      const domainSet = new Set(selectedDomains);
      nodes = nodes.filter((n) => domainSet.has(n.domain));
      const nodeIds = new Set(nodes.map((n) => n.id));
      links = links.filter(
        (l) =>
          nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchIds = new Set(
        nodes.filter((n) => n.name.toLowerCase().includes(q)).map((n) => n.id)
      );
      setHighlightNodes(matchIds);
    } else {
      setHighlightNodes(new Set());
    }

    setGraphData({ nodes, links });
    shouldFrameRef.current = true;
  }, [data, selectedDomains, searchQuery]);

  // Configure d3 forces for better spacing
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;
    const controls = fg.controls?.();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.75;
      controls.zoomSpeed = 0.9;
      controls.minDistance = 110;
      controls.maxDistance = 900;
    }

    // Keep the graph compact enough that the default framing reads clearly.
    fg.d3Force("charge")?.strength(-72)?.distanceMax(260);
    // Link distance based on weight: strong links = closer, weak links = farther
    fg.d3Force("link")?.distance((link: any) => {
      const w = link.value || 1;
      if (link.linkType === "semantic") return Math.max(18, 52 - Math.log2(w + 1) * 8);
      return Math.max(26, 76 - Math.log2(w + 1) * 10);
    });
    // Keep the topology centered instead of drifting toward an edge.
    fg.d3Force("center")?.strength(0.2);
  }, [graphData]);

  const frameGraph = useCallback((duration = 1400) => {
    const fg = fgRef.current;
    if (!fg || graphData.nodes.length === 0) return;

    try {
      fg.cameraPosition({ x: 0, y: 0, z: 260 }, { x: 0, y: 0, z: 0 }, 0);
      fg.zoomToFit(duration, 70);
    } catch {
      // Ignore transient camera errors while the canvas is mounting.
    }
  }, [graphData.nodes.length]);

  useEffect(() => {
    if (webglAvailable === false || graphData.nodes.length === 0) return;

    const timer = window.setTimeout(() => {
      if (shouldFrameRef.current) {
        frameGraph(0);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [frameGraph, graphData.nodes.length, graphData.links.length, webglAvailable]);

  const handleNodeClick = useCallback(
    (node: any) => {
      shouldFrameRef.current = false;
      setSelectedNode({
        id: node.id,
        label: node.name,
        domain: node.domain,
        market_count: node.market_count,
      });
      if (fgRef.current) {
        const distance = 100;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        fgRef.current.cameraPosition(
          {
            x: node.x * distRatio,
            y: node.y * distRatio,
            z: node.z * distRatio,
          },
          node,
          1200
        );
      }
    },
    [setSelectedNode]
  );

  if (!data) {
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
    const filteredNodes = graphData.nodes.length > 0 ? graphData.nodes : data.nodes;
    const filteredLinks = graphData.links.length > 0 ? graphData.links : data.links;
    const topNodes = [...filteredNodes]
      .sort((a, b) => (b.market_count || 0) - (a.market_count || 0))
      .slice(0, 8);
    const semanticLinks = filteredLinks.filter((link: any) => link.linkType === "semantic" || link.type === "semantic");
    const domainMix = topNodes.reduce((acc: Record<string, number>, node: any) => {
      acc[node.domain] = (acc[node.domain] || 0) + 1;
      return acc;
    }, {});
    const dominantDomain = Object.entries(domainMix).sort((a, b) => b[1] - a[1])[0]?.[0];

    return (
      <div
        className="h-full px-10 py-8"
        style={{
          background:
            isDark
              ? "radial-gradient(circle at 14% 18%, rgba(212, 160, 48, 0.14), transparent 22%), radial-gradient(circle at 82% 14%, rgba(130, 95, 255, 0.14), transparent 24%), linear-gradient(135deg, #0f172a 0%, #131f37 100%)"
              : "radial-gradient(circle at 15% 18%, rgba(212, 160, 48, 0.18), transparent 22%), radial-gradient(circle at 80% 12%, rgba(98, 126, 176, 0.12), transparent 24%), linear-gradient(135deg, #f4f3f1 0%, #fbfaf7 100%)",
        }}
      >
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-8 h-full">
          <div
            className="rounded-[28px] border p-8 relative overflow-hidden"
            style={{
              background: isDark ? "rgba(15, 23, 42, 0.76)" : "rgba(255, 255, 255, 0.84)",
              borderColor: "var(--border)",
              boxShadow: "0 24px 80px var(--tooltip-shadow)",
            }}
          >
            <span
              className="text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "var(--text-3)" }}
            >
              Category Topology
            </span>
            <h2
              className="mt-4 max-w-xl font-[var(--font-serif)] text-4xl leading-none"
              style={{ color: "var(--text-1)" }}
            >
              The Polymarket graph compresses half a million contracts into a
              handful of dominant category clusters.
            </h2>
            <p
              className="mt-4 text-sm leading-6 max-w-lg"
              style={{ color: "var(--text-2)" }}
            >
              When 3D rendering is unavailable, the galaxy view falls back to a
              static topology report built from the same node and link export.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-8 max-w-2xl relative z-10">
              <TopologyStat label="Nodes" value={formatNumber(filteredNodes.length)} />
              <TopologyStat label="Links" value={formatNumber(filteredLinks.length)} />
              <TopologyStat label="Semantic Edges" value={formatNumber(semanticLinks.length)} />
            </div>

            <div className="mt-8 flex flex-wrap gap-2 relative z-10">
              {topNodes.slice(0, 6).map((node: any) => (
                <div
                  key={node.id}
                  className="px-3 py-2 rounded-full border text-xs"
                  style={{
                    borderColor: `${getDomainColor(node.domain)}40`,
                    background: `${getDomainColor(node.domain)}12`,
                    color: "var(--text-1)",
                  }}
                >
                  {node.name.replace(/_/g, " ")} · {formatNumber(node.market_count)}
                </div>
              ))}
            </div>

            {dominantDomain && (
              <div
                className="mt-8 inline-flex items-center gap-3 rounded-full px-4 py-2 border relative z-10"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: getDomainColor(dominantDomain) }}
                />
                <span className="text-xs" style={{ color: "var(--text-2)" }}>
                  Dominant cluster
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                  {dominantDomain.replace(/_/g, " ")}
                </span>
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              {topNodes.slice(0, 6).map((node: any, index: number) => (
                <div
                  key={node.id}
                  className="absolute rounded-full blur-2xl"
                  style={{
                    width: `${120 + index * 28}px`,
                    height: `${120 + index * 28}px`,
                    left: `${10 + index * 11}%`,
                    top: `${18 + (index % 3) * 20}%`,
                    background: `${getDomainColor(node.domain)}22`,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            className="rounded-[28px] border p-6"
            style={{
              background: isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.9)",
              borderColor: "var(--border)",
              boxShadow: "0 24px 80px var(--tooltip-shadow)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "var(--text-3)" }}
              >
                Largest Categories
              </span>
              {searchQuery && (
                <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                  Filter: {searchQuery}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {topNodes.map((node: any, index: number) => (
                <div key={node.id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 text-[11px] tabular-nums"
                        style={{ color: "var(--text-3)" }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: getDomainColor(node.domain) }}
                      />
                      <span style={{ color: "var(--text-1)" }}>
                        {node.name.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="tabular-nums" style={{ color: "var(--text-2)" }}>
                      {formatNumber(node.market_count)}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(node.market_count / (topNodes[0]?.market_count || 1)) * 100}%`,
                        background: getDomainColor(node.domain),
                        opacity: 0.72,
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

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      backgroundColor={isDark ? "#0f172a" : "#F4F3F1"}
      nodeThreeObject={(node: any) => {
        const THREE = require("three");
        const isHighlighted =
          highlightNodes.size === 0 || highlightNodes.has(node.id);
        const isHovered = hoverNode === node.id;
        const radius =
          Math.pow(Math.log2((node.market_count || 1) + 1), 1.2) * 0.8;
        const opacity = isHighlighted ? (isHovered ? 1 : 0.88) : 0.12;
        const color = node.color;

        const group = new THREE.Group();

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          metalness: isDark ? 0.2 : 0.1,
          roughness: isDark ? 0.5 : 0.65,
          emissive: color,
          emissiveIntensity: isHovered ? 0.35 : isDark ? 0.08 : 0.03,
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // Glow ring for large nodes
        if (node.market_count > 1000 && isHighlighted) {
          const ringGeo = new THREE.RingGeometry(radius * 1.25, radius * 1.5, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: isHovered ? 0.2 : 0.06,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.lookAt(0, 0, 1);
          group.add(ring);
        }

        // Label
        if (isHovered || (node.market_count > 5000 && isHighlighted)) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = 512;
          canvas.height = 80;
          ctx.clearRect(0, 0, 512, 80);

          const textColor = isDark ? "#E4E4E4" : "#1A1A1A";
          const mutedColor = isDark ? "#8A8A8A" : "#6B6B6B";

          ctx.fillStyle = isHovered ? textColor : (isDark ? "rgba(228,228,228,0.5)" : "rgba(26,26,26,0.4)");
          ctx.font = `${isHovered ? "600 " : ""}${isHovered ? 20 : 14}px Georgia, serif`;
          ctx.textAlign = "center";
          ctx.fillText(node.name.replace(/_/g, " "), 256, isHovered ? 32 : 28);

          if (isHovered) {
            ctx.fillStyle = mutedColor;
            ctx.font = "13px -apple-system, sans-serif";
            ctx.fillText(`${node.market_count?.toLocaleString()} markets`, 256, 58);
          }

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(radius * 8, radius * 1.2, 1);
          sprite.position.set(0, radius + 3, 0);
          group.add(sprite);
        }

        return group;
      }}
      nodeThreeObjectExtend={false}
      linkColor={(link: any) => {
        const w = link.value || 1;
        const strength = Math.min(1, Math.log2(w + 1) / 10);
        if (link.linkType === "semantic") {
          const a = 0.3 + strength * 0.5;
          return isDark ? `rgba(210, 170, 60, ${a})` : `rgba(160, 120, 30, ${a})`;
        }
        const a = 0.06 + strength * 0.3;
        return isDark ? `rgba(255, 255, 255, ${a})` : `rgba(0, 0, 0, ${a})`;
      }}
      linkWidth={(link: any) => {
        const w = link.value || 1;
        if (link.linkType === "semantic") return 0.8 + Math.log2(w + 1) * 0.3;
        return Math.max(0.2, Math.log2(w + 1) * 0.35);
      }}
      linkOpacity={1.0}
      linkDirectionalParticles={(link: any) =>
        link.linkType === "semantic" ? 3 : 0
      }
      linkDirectionalParticleWidth={0.7}
      linkDirectionalParticleSpeed={0.004}
      linkDirectionalParticleColor={() =>
        isDark ? "rgba(210, 170, 60, 0.7)" : "rgba(180, 140, 40, 0.6)"
      }
      onEngineStop={() => {
        if (!shouldFrameRef.current) return;
        shouldFrameRef.current = false;
        frameGraph();
      }}
      onNodeClick={handleNodeClick}
      onNodeHover={(node: any) => setHoverNode(node?.id || null)}
      enableNodeDrag={true}
      warmupTicks={200}
      cooldownTicks={400}
      d3AlphaDecay={0.012}
      d3VelocityDecay={0.2}
    />
  );
}

function TopologyStat({ label, value }: { label: string; value: string }) {
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
