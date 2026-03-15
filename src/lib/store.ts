import { create } from "zustand";

export type ViewMode = "galaxy" | "globe";
export type Theme = "light" | "dark";

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  selectedDomains: string[];
  toggleDomain: (domain: string) => void;
  setSelectedDomains: (domains: string[]) => void;

  selectedCountry: CountryData | null;
  setSelectedCountry: (country: CountryData | null) => void;

  selectedMarket: MarketDetail | null;
  setSelectedMarket: (market: MarketDetail | null) => void;

  selectedNode: GraphNode | null;
  setSelectedNode: (node: GraphNode | null) => void;

  timeRange: [number, number];
  setTimeRange: (range: [number, number]) => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export interface MarketDetail {
  id: string;
  title: string;
  created_at: string | null;
  active: boolean;
  closed: boolean;
  category: string | null;
  domain: string | null;
  countries: string[];
  persons: string[];
}

export interface DomainStat {
  domain: string;
  category: string;
  count: number;
}

export interface CountryData {
  name: string;
  iso: string;
  lat: number;
  lng: number;
  continent: string;
  market_count: number;
}

export interface GlobeArc {
  source: string;
  srcLat: number;
  srcLng: number;
  target: string;
  tgtLat: number;
  tgtLng: number;
  strength: number;
}

export interface TimelineEntry {
  month: string;
  total: number;
  [domain: string]: string | number;
}

export interface GraphNode {
  id: string;
  label: string;
  domain: string;
  market_count: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
  type?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const useAppStore = create<AppState>((set) => ({
  theme: "light",
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

  viewMode: "globe",
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedDomains: [],
  toggleDomain: (domain) =>
    set((state) => ({
      selectedDomains: state.selectedDomains.includes(domain)
        ? state.selectedDomains.filter((d) => d !== domain)
        : [...state.selectedDomains, domain],
    })),
  setSelectedDomains: (domains) => set({ selectedDomains: domains }),

  selectedCountry: null,
  setSelectedCountry: (country) => set({ selectedCountry: country }),

  selectedMarket: null,
  setSelectedMarket: (market) => set({ selectedMarket: market }),

  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),

  timeRange: [2020, 2026],
  setTimeRange: (range) => set({ timeRange: range }),

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
