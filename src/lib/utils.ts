import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Clean domain colors — work on both light and dark
export const DOMAIN_COLORS: Record<string, string> = {
  Sports: "#2B8C5A",
  Crypto: "#D4A030",
  US_Politics: "#9B3060",
  Global_Politics: "#B06080",
  Economics: "#2A7090",
  Geopolitics: "#C04040",
  Science_Technology: "#7040A0",
  Entertainment: "#C09020",
  Weather: "#4090B0",
  Legal: "#C07040",
  Health: "#309060",
  Culture: "#A05888",
  Environment: "#409050",
  Esports: "#6050A0",
  Other: "#808088",
};

export function getDomainColor(domain: string): string {
  return DOMAIN_COLORS[domain] || DOMAIN_COLORS.Other;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function canUseWebGL(): boolean {
  if (typeof document === "undefined") return true;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
