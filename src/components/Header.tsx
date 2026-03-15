"use client";

import { useAppStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

interface HeaderProps {
  totalMarkets: number;
}

export default function Header({ totalMarkets }: HeaderProps) {
  const { searchQuery, setSearchQuery, theme, toggleTheme } = useAppStore();

  return (
    <header
      className="h-14 flex items-center px-6 gap-4 z-10 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img
          src={theme === "dark" ? "/branding/ito_dark_cropped.png" : "/branding/ito_light_cropped.png"}
          alt="Itô"
          className="h-7 w-auto object-contain"
          style={{ marginTop: 2, mixBlendMode: theme === "dark" ? "lighten" : "multiply" }}
        />
        <div className="w-px h-5" style={{ background: "var(--border)" }} />
        <span
          className="text-[13px] tracking-wide"
          style={{ color: "var(--text-3)" }}
        >
          Polymarket Universe
        </span>
      </div>

      <div className="flex-1" />

      {/* Market count */}
      <span className="text-[11px] tabular-nums" style={{ color: "var(--text-3)" }}>
        {formatNumber(totalMarkets)} markets
      </span>

      <div className="w-px h-4" style={{ background: "var(--border)" }} />

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-3)" }}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="rounded-md pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none transition-all"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "var(--text-3)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="w-px h-4" style={{ background: "var(--border)" }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: "var(--text-2)" }}
        title={theme === "light" ? "Dark mode" : "Light mode"}
      >
        {theme === "light" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        )}
      </button>
    </header>
  );
}
