/**
 * useDispatchFilters.ts
 * Custom hook for managing persistent dispatch filters
 */

import { useState, useEffect } from "react";

export interface DispatchFilters {
  status: string[];
  marginRange: [number, number];
  search: string;
  sortBy: "id" | "margin" | "profit" | "date";
  sortOrder: "asc" | "desc";
}

const DEFAULT_FILTERS: DispatchFilters = {
  status: ["available", "quoted", "assigned", "in_transit", "delivered", "invoiced", "paid"],
  marginRange: [0, 150],
  search: "",
  sortBy: "date",
  sortOrder: "desc",
};

const STORAGE_KEY = "dispatch_filters";

export function useDispatchFilters() {
  const [filters, setFiltersState] = useState<DispatchFilters>(DEFAULT_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFiltersState({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch (error) {
      console.error("[useDispatchFilters] Error loading from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever filters change
  const setFilters = (newFilters: Partial<DispatchFilters> | ((prev: DispatchFilters) => DispatchFilters)) => {
    setFiltersState((prev) => {
      const updated = typeof newFilters === "function" ? newFilters(prev) : { ...prev, ...newFilters };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("[useDispatchFilters] Error saving to localStorage:", error);
      }
      return updated;
    });
  };

  // Apply quick view preset
  const applyQuickView = (view: "urgent" | "high_margin" | "at_risk" | "unassigned" | "pending") => {
    switch (view) {
      case "urgent":
        setFilters({
          status: ["available", "assigned"],
          marginRange: [0, 8],
        });
        break;
      case "high_margin":
        setFilters({
          status: ["available", "quoted", "assigned"],
          marginRange: [20, 50],
        });
        break;
      case "at_risk":
        setFilters({
          status: ["assigned", "in_transit"],
          marginRange: [8, 15],
        });
        break;
      case "unassigned":
        setFilters({
          status: ["available"],
        });
        break;
      case "pending":
        setFilters({
          status: ["assigned"],
        });
        break;
    }
  };

  // Reset to defaults
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    setFilters,
    applyQuickView,
    resetFilters,
    isLoaded,
  };
}
