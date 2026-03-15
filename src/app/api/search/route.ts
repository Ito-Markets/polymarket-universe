import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface MarketRecord {
  id: string;
  t: string; // title
  c: string; // created_at (date only)
  a: boolean; // active
  cl: boolean; // closed
  es: string; // event_slug
  cat: string; // category
}

let cachedMarkets: MarketRecord[] | null = null;

function loadMarkets(): MarketRecord[] {
  if (cachedMarkets) return cachedMarkets;
  const dataDir = path.join(process.cwd(), "data");
  const indexFiles = fs
    .readdirSync(dataDir)
    .filter(
      (file) =>
        file.startsWith("all_markets_index") && file.endsWith(".json")
    )
    .sort();

  cachedMarkets = indexFiles.flatMap((file) => {
    const raw = fs.readFileSync(path.join(dataDir, file), "utf-8");
    return JSON.parse(raw) as MarketRecord[];
  });
  return cachedMarkets!;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase().trim();
  const limitParam = searchParams.get("limit");
  const exportAll = searchParams.get("export") === "1";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const markets = loadMarkets();
  const matches = markets.filter((m) => m.t.toLowerCase().includes(query));

  const total = matches.length;
  const limit = exportAll ? total : Math.min(parseInt(limitParam || "100"), 500);
  const results = matches.slice(0, limit).map((m) => ({
    id: m.id,
    title: m.t,
    created_at: m.c,
    active: m.a,
    closed: m.cl,
    category: m.cat || null,
    domain: null as string | null,
    countries: [] as string[],
    persons: [] as string[],
  }));

  return NextResponse.json({ results, total });
}
