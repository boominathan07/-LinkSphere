import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

const STALE_TIME = 5 * 60 * 1000;

const analyticsQueryDefaults = {
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000)
};

export function useSummary(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-summary"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/summary");
      return data ?? {};
    }
  });
}

export function useWeekly(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-weekly"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/weekly");
      return data?.points ?? [];
    }
  });
}

export function usePerLinkAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-per-link"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/per-link");
      return data?.items ?? [];
    }
  });
}

export function useDeviceAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-devices"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/devices");
      return data?.items ?? [];
    }
  });
}

export function useReferrerAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-referrers"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/referrers");
      return data?.items ?? [];
    }
  });
}

export function useMonthly(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-monthly"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/monthly");
      return data?.points ?? [];
    }
  });
}

export function useHourly(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-hourly"],
    staleTime: 60 * 1000,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/hourly");
      return data?.points ?? [];
    }
  });
}

export function useGeoAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-geo"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/geo");
      return {
        countries: data?.countries ?? [],
        cities: data?.cities ?? []
      };
    }
  });
}

export function useRecentActivity(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-recent-activity"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/recent-activity");
      return data?.items ?? [];
    }
  });
}

export function useBrowserAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-browsers"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/browsers");
      return data?.items ?? [];
    }
  });
}

export function useOsAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-os"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/os");
      return data?.items ?? [];
    }
  });
}

export function useRealtimeAnalytics(refetchInterval = 10000, options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-realtime"],
    staleTime: 0,
    refetchInterval,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/realtime");
      return {
        clicksLast30Min: data?.clicksLast30Min ?? 0,
        windowMinutes: data?.windowMinutes ?? 30,
        maxClicksPerHourToday: data?.maxClicksPerHourToday ?? 0
      };
    }
  });
}

export function useAudienceAnalytics(options = {}) {
  return useQuery({
    ...analyticsQueryDefaults,
    queryKey: ["analytics-audience"],
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get("/analytics/audience");
      return data ?? {};
    }
  });
}
