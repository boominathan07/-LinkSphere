import GlassCard from "../components/ui/GlassCard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";
import {
  useBrowserAnalytics,
  useDeviceAnalytics,
  useGeoAnalytics,
  useHourly,
  useMonthly,
  useOsAnalytics,
  usePerLinkAnalytics,
  useRealtimeAnalytics,
  useReferrerAnalytics,
  useSummary,
  useWeekly
} from "../hooks/useAnalytics";
import { BROWSER_COLORS, CHART_COLORS, PIE_COLORS, REFERRER_COLORS } from "../constants/chartColors";

const TABS = ["Overview", "Geo", "Devices", "Links", "Referrers"];
const RANGE_LABELS = { today: "TODAY", "7d": "7D", "30d": "30D", custom: "CUSTOM" };
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const countryNameFormatter = new Intl.DisplayNames(["en"], { type: "region" });

// Convert UTC to IST (Indian Standard Time)
function convertToIST(date) {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes
  return new Date(date.getTime() + istOffset);
}

function getCurrentISTHour() {
  const now = new Date();
  const istTime = convertToIST(now);
  return istTime.getHours();
}

function isoToFlag(iso) {
  const code = String(iso || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

function labelCountry(iso) {
  const code = String(iso || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "Unknown";
  try {
    return countryNameFormatter.of(code) || code;
  } catch (error) {
    return code;
  }
}

function normalizeReferrer(referrer) {
  const value = String(referrer || "").toLowerCase();
  if (!value || value === "direct") return "Direct";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("youtube") || value.includes("youtu.be")) return "YouTube";
  if (value.includes("twitter") || value.includes("x.com")) return "Twitter/X";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("linkedin")) return "LinkedIn";
  return "Other";
}

function LazyChart({ children, height = "h-72" }) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "200px 0px" });
  return (
    <div ref={ref} className={height}>
      {inView ? children : <div className="h-full animate-pulse rounded-xl bg-bg-elevated/40" />}
    </div>
  );
}

function ChartSkeleton({ className = "h-72" }) {
  return <div className={`animate-pulse rounded-xl bg-bg-elevated/40 ${className}`} />;
}

function isAuthError(err) {
  return err?.response?.status === 401;
}

// Peak Hours Chart Component with IST
function PeakHoursChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxClicks = Math.max(...data.map(h => h.clicks || 0));
  
  // Convert UTC hours to IST
  const getISTHour = (utcHour) => {
    let istHour = utcHour + 5;
    if (istHour >= 24) istHour -= 24;
    return istHour;
  };
  
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2 mt-4">
      {data.slice(0, 12).map((hour) => {
        const istHour = getISTHour(hour.hour);
        return (
          <div key={hour.hour} className="text-center group cursor-pointer">
            <div className="relative h-24 flex items-end justify-center">
              <div 
                className="w-full bg-gradient-to-t from-accent-violet to-accent-cyan rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                style={{ height: `${(hour.clicks / maxClicks) * 100}%`, minHeight: '4px' }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">{istHour}:00</p>
            <p className="text-xs text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity">{hour.clicks} clicks</p>
          </div>
        );
      })}
    </div>
  );
}

// AI Recommendation System
function getSmartRecommendations(peakHour, topCountry, topLinks, hourlyData, totalClicks) {
  const recommendations = [];
  const istPeakHour = peakHour ? (peakHour.hour + 5) % 24 : null;
  
  if (peakHour && peakHour.clicks > 0) {
    recommendations.push({
      icon: "⏰",
      title: "Best Time to Post",
      message: `Your audience is most active at ${istPeakHour}:00 IST. Schedule your posts around this time for maximum engagement!`,
      color: "from-cyan-500 to-blue-500",
      priority: 1
    });
  }
  
  if (topCountry && topCountry.clicks > 0 && topCountry.country !== "Unknown") {
    recommendations.push({
      icon: "🌍",
      title: "Top Location Alert",
      message: `Your content is popular in ${topCountry.countryName || topCountry.country}! Consider creating content tailored to this region.`,
      color: "from-emerald-500 to-green-500",
      priority: 2
    });
  }
  
  if (topLinks.length > 0 && topLinks[0].clicks > 0) {
    recommendations.push({
      icon: "🏆",
      title: "Top Performing Link",
      message: `"${topLinks[0].title}" is your best link with ${topLinks[0].clicks} clicks! Keep promoting it.`,
      color: "from-violet-500 to-purple-500",
      priority: 3
    });
  }
  
  if (totalClicks < 10) {
    recommendations.push({
      icon: "💡",
      title: "Getting Started Tip",
      message: "Share your profile link on Instagram, Twitter, and other social platforms to get more clicks!",
      color: "from-amber-500 to-orange-500",
      priority: 4
    });
  }
  
  return recommendations.sort((a,b) => a.priority - b.priority);
}

function AnalyticsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("Overview");
  const [range, setRange] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tabOverview = activeTab === "Overview";
  const tabGeo = activeTab === "Geo";
  const tabDevices = activeTab === "Devices";
  const tabLinks = activeTab === "Links";
  const tabReferrers = activeTab === "Referrers";

  const weeklyQuery = useWeekly({ enabled: tabOverview && (range === "7d" || range === "custom") });
  const monthlyQuery = useMonthly({ enabled: tabOverview && range === "30d" });
  const hourlyQuery = useHourly({ enabled: tabOverview && range === "today" });
  const realtimeQuery = useRealtimeAnalytics(10000, { enabled: tabOverview });
  const geoQuery = useGeoAnalytics({ enabled: tabGeo });
  const devicesQuery = useDeviceAnalytics({ enabled: tabDevices });
  const browsersQuery = useBrowserAnalytics({ enabled: tabDevices });
  const osQuery = useOsAnalytics({ enabled: tabDevices });
  const perLinkQuery = usePerLinkAnalytics({ enabled: tabLinks });
  const summaryQuery = useSummary({ enabled: tabLinks });
  const referrersQuery = useReferrerAnalytics({ enabled: tabReferrers });

  const weekly = weeklyQuery.data ?? [];
  const monthly = monthlyQuery.data ?? [];
  const hourly = hourlyQuery.data ?? [];
  const realtime = realtimeQuery.data ?? { clicksLast30Min: 0, windowMinutes: 30, maxClicksPerHourToday: 0 };
  const devices = devicesQuery.data ?? [];
  const browsers = browsersQuery.data ?? [];
  const os = osQuery.data ?? [];
  const geo = geoQuery.data ?? { countries: [], cities: [] };
  const perLink = perLinkQuery.data ?? [];
  const summary = summaryQuery.data ?? { views: 0 };
  const referrers = referrersQuery.data ?? [];

  // Auto-refresh effect - Updates data every 10 seconds
  useEffect(() => {
    let interval;
    
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ["analytics-realtime"] }),
          queryClient.refetchQueries({ queryKey: ["analytics-summary"] }),
          queryClient.refetchQueries({ queryKey: ["analytics-weekly"] }),
          queryClient.refetchQueries({ queryKey: ["analytics-monthly"] }),
          queryClient.refetchQueries({ queryKey: ["analytics-hourly"] })
        ]);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    interval = setInterval(refreshData, 10000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queryClient]);

  // Update last updated time
  useEffect(() => {
    const updateTime = () => setLastUpdated(new Date());
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      updateTime();
    });
    return () => unsubscribe();
  }, [queryClient]);

  const manualRefresh = async () => {
    setIsRefreshing(true);
    toast.loading("Refreshing analytics...", { id: "refresh" });
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["analytics-realtime"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-summary"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-weekly"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-monthly"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-hourly"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-geo"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-devices"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-per-link"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-referrers"] })
      ]);
      setLastUpdated(new Date());
      toast.success("Analytics refreshed!", { id: "refresh" });
    } catch (error) {
      toast.error("Refresh failed", { id: "refresh" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const overviewChartPending = useMemo(() => {
    if (!tabOverview) return false;
    return (
      (range === "today" && hourlyQuery.isPending) ||
      ((range === "7d" || range === "custom") && weeklyQuery.isPending) ||
      (range === "30d" && monthlyQuery.isPending)
    );
  }, [tabOverview, range, hourlyQuery.isPending, weeklyQuery.isPending, monthlyQuery.isPending]);

  const tabPending = useMemo(() => {
    if (tabOverview) {
      return overviewChartPending || realtimeQuery.isPending;
    }
    if (tabGeo) return geoQuery.isPending;
    if (tabDevices) return devicesQuery.isPending || browsersQuery.isPending || osQuery.isPending;
    if (tabLinks) return perLinkQuery.isPending || summaryQuery.isPending;
    if (tabReferrers) return referrersQuery.isPending;
    return false;
  }, [tabOverview, tabGeo, tabDevices, tabLinks, tabReferrers,
    overviewChartPending, realtimeQuery.isPending, geoQuery.isPending,
    devicesQuery.isPending, browsersQuery.isPending, osQuery.isPending,
    perLinkQuery.isPending, summaryQuery.isPending, referrersQuery.isPending]);

  useEffect(() => {
    if (!tabPending) {
      setSlowLoad(false);
      return undefined;
    }
    const t = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(t);
  }, [tabPending]);

  const tabHasError = useMemo(() => {
    if (tabOverview) {
      const q = (range === "today" && hourlyQuery.isError) ||
        ((range === "7d" || range === "custom") && weeklyQuery.isError) ||
        (range === "30d" && monthlyQuery.isError) ||
        realtimeQuery.isError;
      return q;
    }
    if (tabGeo) return geoQuery.isError;
    if (tabDevices) return devicesQuery.isError || browsersQuery.isError || osQuery.isError;
    if (tabLinks) return perLinkQuery.isError || summaryQuery.isError;
    if (tabReferrers) return referrersQuery.isError;
    return false;
  }, [tabOverview, tabGeo, tabDevices, tabLinks, tabReferrers, range,
    hourlyQuery.isError, weeklyQuery.isError, monthlyQuery.isError, realtimeQuery.isError,
    geoQuery.isError, devicesQuery.isError, browsersQuery.isError, osQuery.isError,
    perLinkQuery.isError, summaryQuery.isError, referrersQuery.isError]);

  const tabAuthError = useMemo(() => {
    const checks = [
      hourlyQuery.error, weeklyQuery.error, monthlyQuery.error, realtimeQuery.error,
      geoQuery.error, devicesQuery.error, browsersQuery.error, osQuery.error,
      perLinkQuery.error, summaryQuery.error, referrersQuery.error
    ];
    return checks.some((e) => isAuthError(e));
  }, [hourlyQuery.error, weeklyQuery.error, monthlyQuery.error, realtimeQuery.error,
    geoQuery.error, devicesQuery.error, browsersQuery.error, osQuery.error,
    perLinkQuery.error, summaryQuery.error, referrersQuery.error]);

  const refetchTab = useCallback(async () => {
    if (tabOverview) {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["analytics-weekly"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-monthly"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-hourly"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-realtime"] })
      ]);
    } else if (tabGeo) {
      await queryClient.refetchQueries({ queryKey: ["analytics-geo"] });
    } else if (tabDevices) {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["analytics-devices"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-browsers"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-os"] })
      ]);
    } else if (tabLinks) {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["analytics-per-link"] }),
        queryClient.refetchQueries({ queryKey: ["analytics-summary"] })
      ]);
    } else if (tabReferrers) {
      await queryClient.refetchQueries({ queryKey: ["analytics-referrers"] });
    }
    setLastUpdated(new Date());
  }, [queryClient, tabOverview, tabGeo, tabDevices, tabLinks, tabReferrers]);

  const weeklyData = weekly.length ? weekly.slice(-7) : [{ day: "No data", clicks: 0 }];
  const monthlyData = monthly.length ? monthly : [{ month: "No data", clicks: 0 }];
  const profileViews = summary.views ?? 0;
  const totalClicks = perLink.reduce((sum, l) => sum + (l.clicks || 0), 0);

  const topLinksData = perLink.length
    ? perLink.slice(0, 8).map((item) => ({
        id: item._id,
        name: item.title,
        url: item.url,
        clicks: item.clicks,
        ctr: profileViews > 0 ? Number(((item.clicks / profileViews) * 100).toFixed(1)) : 0,
        trend: item.trend || "flat"
      }))
    : [{ id: "none", name: "No links", url: "-", clicks: 0, ctr: 0, trend: "flat" }];

  const deviceData = devices.length ? devices.map((item) => ({ name: item.device, value: item.clicks })) : [];
  
  const groupedReferrers = useMemo(() => {
    const grouped = {};
    for (const item of referrers) {
      const key = normalizeReferrer(item.referrer);
      grouped[key] = (grouped[key] || 0) + (item.clicks || 0);
    }
    const order = ["Instagram", "TikTok", "YouTube", "Twitter/X", "Facebook", "LinkedIn", "Direct", "Other"];
    return order.map((source) => ({ source, clicks: grouped[source] || 0 })).filter(item => item.clicks > 0);
  }, [referrers]);
  
  const hasReferrerData = groupedReferrers.some((item) => item.clicks > 0);
  const browserData = browsers.length ? browsers.map((item) => ({ name: item.browser, clicks: item.clicks })) : [];
  const osData = os.length ? os.map((item) => ({ name: item.os, clicks: item.clicks })) : [];
  
  // Filter out Unknown countries
  const countryData = geo.countries?.length
    ? geo.countries.filter(c => c.country && c.country !== "Unknown").slice(0, 12).map((item) => ({ 
        ...item, 
        countryName: labelCountry(item.country), 
        flag: isoToFlag(item.country) 
      }))
    : [];
    
  const cityData = geo.cities?.length ? geo.cities.filter(c => c.city && c.city !== "Unknown").slice(0, 10) : [];
  const clickVelocity = realtime.maxClicksPerHourToday ?? 0;
  const chartColors = PIE_COLORS;
  
  const geoDensityMap = useMemo(() => {
    const map = {};
    for (const item of geo.countries || []) {
      const code = String(item.country || "").toUpperCase();
      if (code && code !== "UNKNOWN") map[code] = item.clicks;
    }
    return map;
  }, [geo.countries]);
  
  const maxGeoClicks = useMemo(() => Math.max(...Object.values(geoDensityMap), 1), [geoDensityMap]);
  
  const customFilteredWeekly = useMemo(() => {
    if (!customStart || !customEnd || !weekly.length) return weeklyData;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const filtered = weekly.filter((item) => {
      const date = new Date(item.day);
      return date >= start && date <= end;
    });
    return filtered.length ? filtered : [{ day: "No data", clicks: 0 }];
  }, [customStart, customEnd, weekly, weeklyData]);
  
  // Convert hourly data to IST for display
  const overviewSeries = range === "today"
    ? hourly.map((item) => ({ 
        day: `${((item.hour + 5) % 24)}:00`, 
        clicks: item.clicks 
      }))
    : range === "30d"
      ? monthlyData
      : range === "custom"
        ? customFilteredWeekly
        : weeklyData;

  const peakHour = useMemo(() => {
    if (hourly.length === 0) return null;
    const max = Math.max(...hourly.map(h => h.clicks || 0));
    return hourly.find(h => h.clicks === max);
  }, [hourly]);
  
  const topCountry = useMemo(() => {
    if (geo.countries?.length === 0) return null;
    const validCountries = geo.countries.filter(c => c.country && c.country !== "Unknown");
    return validCountries[0] || null;
  }, [geo.countries]);

  useEffect(() => {
    const recos = getSmartRecommendations(peakHour, topCountry, topLinksData, hourly, totalClicks);
    setRecommendations(recos);
  }, [peakHour, topCountry, topLinksData, hourly, totalClicks]);

  const onDownloadCsv = async () => {
    if (user?.plan === "free") {
      setShowUpgradeModal(true);
      return;
    }
    try {
      const response = await api.get("/analytics/export/csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `linksphere-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV downloaded successfully");
    } catch (_error) {
      toast.error("Failed to export CSV");
    }
  };

  const onRangeClick = (key) => {
    if (key === "custom" && user?.plan === "free") {
      setShowUpgradeModal(true);
      return;
    }
    setRange(key);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Analytics Command Center
          </h1>
          <p className="text-text-muted text-sm mt-1">Track your link performance and audience insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Status */}
          <div className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-white/5 border border-white/10">
            <span className={`inline-block w-2 h-2 rounded-full ${isRefreshing ? 'bg-yellow-400 animate-pulse' : 'bg-accent-lime animate-pulse'}`}></span>
            <span className="text-xs text-text-muted">
              {isRefreshing ? 'Updating...' : 'Live'}
            </span>
            <span className="text-xs text-text-muted hidden sm:inline">•</span>
            <span className="text-xs text-text-muted hidden sm:inline">{lastUpdated.toLocaleTimeString()}</span>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={manualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs md:text-sm font-medium hover:bg-white/20 transition-all disabled:opacity-50"
          >
            {isRefreshing ? '⟳' : '🔄'} <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          {/* Download Button */}
          <button
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan text-white text-xs md:text-sm font-medium hover:shadow-lg transition-all"
            onClick={onDownloadCsv}
          >
            📥 <span className="hidden sm:inline">Download CSV</span>
          </button>
        </div>
      </div>

      {/* AI Smart Recommendations - Responsive */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.slice(0, 2).map((rec, idx) => (
            <GlassCard key={idx} className={`bg-gradient-to-r ${rec.color} border-0 p-4`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-xl">
                  {rec.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm md:text-base">{rec.title}</h3>
                  <p className="text-white/80 text-xs md:text-sm mt-1">{rec.message}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Tabs & Controls - Responsive */}
      <GlassCard className="p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex flex-wrap gap-1 md:gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`rounded-xl px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm transition-all ${
                  activeTab === tab 
                    ? "bg-gradient-to-r from-accent-violet to-accent-cyan text-white shadow-lg" 
                    : "bg-white/5 text-text-muted hover:bg-white/10"
                }`}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 md:gap-2 ml-auto">
            {["today", "7d", "30d", "custom"].map((item) => (
              <button
                key={item}
                className={`rounded-lg border px-2 py-1 md:px-3 md:py-1.5 text-xs transition-all ${
                  range === item 
                    ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan" 
                    : "border-white/10 text-text-muted hover:border-white/20"
                }`}
                onClick={() => onRangeClick(item)}
                type="button"
              >
                {RANGE_LABELS[item] ?? item}
              </button>
            ))}
          </div>
        </div>
        {range === "custom" && user?.plan !== "free" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
            <label className="text-xs md:text-sm text-text-muted">From:</label>
            <input
              className="rounded-lg border border-white/10 bg-bg-elevated/60 px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <label className="text-xs md:text-sm text-text-muted">To:</label>
            <input
              className="rounded-lg border border-white/10 bg-bg-elevated/60 px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </GlassCard>

      {/* Slow Load Warning */}
      {slowLoad && tabPending && (
        <GlassCard className="border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-text-muted">Analytics is taking longer than usual. You can keep browsing or retry.</p>
          <button type="button" className="mt-2 text-sm font-medium text-accent-cyan hover:underline" onClick={() => refetchTab()}>
            Retry load
          </button>
        </GlassCard>
      )}

      {/* Error State */}
      {tabHasError && (
        <GlassCard className="border border-accent-rose/40 p-4">
          <p className="text-accent-rose text-sm">
            {tabAuthError ? "Session expired. Please sign in again." : "We couldn't load this tab's analytics."}
          </p>
          {!tabAuthError && (
            <button type="button" className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm" onClick={() => refetchTab()}>
              Retry
            </button>
          )}
        </GlassCard>
      )}

      {/* Overview Tab */}
      {activeTab === "Overview" && (
        <div className="space-y-6">
          {/* Main Chart - Bar Chart */}
          <GlassCard className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="font-display text-lg md:text-xl">Click Trends - {range === "7d" ? "Last 7 Days" : range === "30d" ? "Last 30 Days" : range === "today" ? "Today" : "Custom"}</h2>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Total: {overviewSeries.reduce((a,b) => a + (b.clicks || 0), 0)} clicks</span>
              </div>
            </div>
            <div className="h-64 sm:h-80">
              {overviewChartPending ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#161B2E", border: "1px solid #6C63FF", borderRadius: "8px" }} />
                    <Bar dataKey="clicks" fill="#6C63FF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          {/* Peak Hours Analysis */}
          {hourly.length > 0 && (
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xl">⏰</span>
                <h2 className="font-display text-lg md:text-xl">Peak Hours Analysis</h2>
                <span className="text-xs text-accent-cyan ml-auto">Auto-detected based on click patterns</span>
              </div>
              <div className="overflow-x-auto">
                <PeakHoursChart data={hourly} />
              </div>
              {peakHour && (
                <div className="mt-4 p-3 rounded-lg bg-accent-violet/10 border border-accent-violet/20">
                  <p className="text-xs md:text-sm">
                    💡 <span className="text-accent-cyan font-medium">Best time to post:</span> Your audience is most active at 
                    <span className="text-accent-lime font-medium"> {((peakHour.hour + 5) % 24)}:00 IST</span>
                    - {peakHour.clicks} clicks during this hour!
                  </p>
                </div>
              )}
            </GlassCard>
          )}

          {/* Stats Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <GlassCard className="p-4">
              <h2 className="font-display text-lg mb-3">Real-time Pulse</h2>
              <div className="rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-cyan/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent-lime animate-pulse shadow-lg shadow-accent-lime/50" />
                  <p className="text-xs text-text-muted">Live clicks (last 30 min)</p>
                </div>
                <p className="text-3xl md:text-5xl font-bold text-accent-cyan">{realtime.clicksLast30Min}</p>
              </div>
              <div className="mt-3 rounded-xl bg-bg-elevated/60 p-4">
                <p className="text-xs text-text-muted">Peak hour today</p>
                <p className="text-xl md:text-2xl font-bold text-accent-lime">{clickVelocity}</p>
                <p className="text-xs text-text-muted mt-1">Max clicks in a single hour</p>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <h2 className="font-display text-lg mb-3">Quick Stats</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                  <span className="text-sm">Total Clicks</span>
                  <span className="text-accent-cyan font-bold text-lg">{totalClicks}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                  <span className="text-sm">Profile Views</span>
                  <span className="text-accent-cyan font-bold text-lg">{profileViews}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                  <span className="text-sm">Click-through Rate</span>
                  <span className="text-accent-cyan font-bold text-lg">{profileViews > 0 ? ((totalClicks / profileViews) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Geo Tab */}
      {activeTab === "Geo" && (
        <div className="space-y-6">
          <GlassCard className="p-4">
            <h2 className="mb-4 font-display text-lg md:text-xl">World Map Distribution</h2>
            <div className="h-64 md:h-96 overflow-hidden rounded-xl bg-bg-elevated/40 p-2">
              <ComposableMap projectionConfig={{ scale: 145 }}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geoFeature) => {
                      const iso = String(geoFeature.properties.ISO_A2 || "").toUpperCase();
                      const clicks = geoDensityMap[iso] || 0;
                      const intensity = clicks ? Math.min(clicks / maxGeoClicks, 0.9) : 0.05;
                      return (
                        <Geography
                          key={geoFeature.rsmKey}
                          geography={geoFeature}
                          fill={`rgba(108, 99, 255, ${intensity})`}
                          stroke="#0D0D1A"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: "#6C63FF", outline: "none" },
                            pressed: { outline: "none" }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>
            <p className="mt-3 text-xs text-text-muted text-center">Location is approximate based on IP address | Darker color = more clicks</p>
          </GlassCard>
          
          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard className="p-4">
              <h3 className="mb-4 font-display text-base md:text-lg">Top Countries</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {countryData.length > 0 ? (
                  countryData.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.flag}</span>
                        <span className="text-sm">{item.countryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 md:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan" style={{ width: `${item.percent}%` }} />
                        </div>
                        <span className="text-accent-cyan text-xs md:text-sm min-w-[60px] text-right">{item.clicks} clicks ({item.percent}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-text-muted text-center py-8 text-sm">No location data yet. Share your profile to see countries.</p>
                )}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <h3 className="mb-4 font-display text-base md:text-lg">Top Cities</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cityData.length > 0 ? (
                  cityData.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                      <span className="text-sm">📍 {item.city}</span>
                      <span className="text-accent-cyan text-sm">{item.clicks} clicks</span>
                    </div>
                  ))
                ) : (
                  <p className="text-text-muted text-center py-8 text-sm">No city data yet. Share your profile to see cities.</p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {/* Devices Tab */}
{activeTab === "Devices" && (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {/* Device Split - Fixed */}
    <GlassCard className="p-4">
      <h2 className="mb-4 font-display text-lg md:text-xl">Device Split</h2>
      <div className="h-52 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={deviceData.length ? deviceData : [{ name: "No Data", value: 1 }]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : name}
            >
              {deviceData.map((entry, idx) => (
                <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: "#1a1a2e", border: "1px solid #6C63FF", borderRadius: "8px" }}
              formatter={(value, name) => [`${value} clicks`, name]}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Device Stats Summary - Added for better visibility */}
      {deviceData.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap justify-center gap-3">
          {deviceData.map((device, idx) => {
            const total = deviceData.reduce((sum, d) => sum + d.value, 0);
            const percent = total > 0 ? ((device.value / total) * 100).toFixed(0) : 0;
            return (
              <div key={device.name} className="flex items-center gap-1.5 group cursor-pointer">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[idx % chartColors.length] }} />
                <span className="text-xs capitalize">{device.name}</span>
                <span className="text-xs text-accent-cyan font-medium">{device.value}</span>
                <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">({percent}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>

    {/* Browser Breakdown - With Progress Bar */}
    <GlassCard className="p-4">
      <h2 className="mb-4 font-display text-lg md:text-xl">Browser Breakdown</h2>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {browserData.length > 0 ? (
          browserData.map((browser, idx) => {
            const browserColors = { 
              chrome: "#6C63FF", 
              firefox: "#FF8C00", 
              safari: "#00D4FF", 
              edge: "#39FF14", 
              opera: "#FF3CAC",
              unknown: "#94A3B8"
            };
            const color = browserColors[browser.name?.toLowerCase()] || chartColors[idx % chartColors.length];
            const total = browserData.reduce((sum, b) => sum + b.clicks, 0);
            const percent = total > 0 ? ((browser.clicks / total) * 100).toFixed(1) : 0;
            
            return (
              <div key={browser.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm capitalize">{browser.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent-cyan text-sm font-medium">{browser.clicks}</span>
                    <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">{percent}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">No browser data yet</p>
            <p className="text-text-muted text-xs mt-1">Data appears when visitors click your links</p>
          </div>
        )}
      </div>
    </GlassCard>

    {/* OS Breakdown - With Progress Bar */}
    <GlassCard className="p-4">
      <h2 className="mb-4 font-display text-lg md:text-xl">OS Breakdown</h2>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {osData.length > 0 ? (
          osData.map((os, idx) => {
            const total = osData.reduce((sum, o) => sum + o.clicks, 0);
            const percent = total > 0 ? ((os.clicks / total) * 100).toFixed(1) : 0;
            const osColors = {
              windows: "#00D4FF",
              macos: "#6C63FF",
              ios: "#39FF14",
              android: "#FFD700",
              linux: "#FF3CAC"
            };
            const color = osColors[os.name?.toLowerCase()] || chartColors[idx % chartColors.length];
            
            return (
              <div key={os.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm capitalize">{os.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent-cyan text-sm font-medium">{os.clicks}</span>
                    <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">{percent}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">No OS data yet</p>
            <p className="text-text-muted text-xs mt-1">Data appears when visitors click your links</p>
          </div>
        )}
      </div>
    </GlassCard>
  </div>
)}

      {/* Links Tab */}
      {activeTab === "Links" && (
        <div className="space-y-6">
          <GlassCard className="p-4">
            <h2 className="mb-4 font-display text-lg md:text-xl">Link Performance Ranking</h2>
            <div className="h-64 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLinksData} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" width={80} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #6C63FF", borderRadius: "8px" }} />
                  <Bar dataKey="clicks" fill="#6C63FF" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

         <GlassCard className="p-4">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[500px]">
      <thead className="border-b border-white/10">
        <tr className="text-left text-xs md:text-sm text-text-muted">
          <th className="pb-2">Link</th>
          <th className="pb-2 hidden md:table-cell">URL</th>
          <th className="pb-2 text-right">Clicks</th>
          <th className="pb-2 text-right">CTR</th>
          <th className="pb-2 text-center">Trend</th>
        </tr>
      </thead>
      <tbody>
        {topLinksData.map((item) => (
          <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
            <td className="py-2 text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-[150px]">{item.name}</td>
            <td className="py-2 text-xs text-text-muted truncate max-w-[150px] hidden md:table-cell">{item.url}</td>
            <td className="py-2 text-xs md:text-sm text-accent-cyan text-right">{item.clicks}</td>
            <td className="py-2 text-xs md:text-sm text-right">{item.ctr}%</td>
            <td className="py-2 text-center">
              <span className={`text-base md:text-lg ${item.trend === "up" ? "text-accent-lime" : item.trend === "down" ? "text-accent-rose" : "text-text-muted"}`}>
                {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</GlassCard>
        </div>
      )}

      {/* Referrers Tab */}
     {/* Referrers Tab */}
{activeTab === "Referrers" && (
  <div className="grid gap-6 md:grid-cols-2">
    {/* Traffic Sources Pie Chart */}
    <GlassCard className="p-4">
      <h2 className="mb-4 font-display text-lg md:text-xl">Traffic Sources</h2>
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={groupedReferrers.length ? groupedReferrers : [{ source: "No Data", clicks: 1 }]} 
              dataKey="clicks" 
              nameKey="source" 
              cx="50%" 
              cy="50%" 
              outerRadius={80} 
              label={({ source, percent }) => percent > 0.05 ? `${source} ${(percent * 100).toFixed(0)}%` : null}
            >
              {groupedReferrers.map((entry, idx) => (
                <Cell key={entry.source} fill={chartColors[idx % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: "#1a1a2e", border: "1px solid #6C63FF", borderRadius: "8px" }}
              formatter={(value, name) => [`${value} clicks`, name]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={40}
              wrapperStyle={{ fontSize: '11px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>

    {/* Referrer Details - Enhanced with Icons, Progress Bars & Hover Effects */}
    <GlassCard className="p-4">
      <h2 className="mb-4 font-display text-lg md:text-xl">Referrer Details</h2>
      <div className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto pr-1">
        {groupedReferrers.length > 0 ? (
          groupedReferrers.map((item, idx) => {
            const total = groupedReferrers.reduce((sum, i) => sum + i.clicks, 0);
            const percent = total > 0 ? ((item.clicks / total) * 100).toFixed(1) : 0;
            
            // Get icon and color for each source
            const getSourceStyle = (source) => {
              const styles = {
                Instagram: { icon: "📸", color: "#E4405F", gradient: "from-pink-500 to-rose-500" },
                Twitter: { icon: "🐦", color: "#1DA1F2", gradient: "from-sky-500 to-blue-500" },
                Facebook: { icon: "📘", color: "#1877F2", gradient: "from-blue-600 to-indigo-600" },
                YouTube: { icon: "📺", color: "#FF0000", gradient: "from-red-500 to-rose-500" },
                LinkedIn: { icon: "💼", color: "#0077B5", gradient: "from-blue-500 to-cyan-500" },
                Direct: { icon: "🔗", color: "#10B981", gradient: "from-emerald-500 to-green-500" },
                TikTok: { icon: "🎵", color: "#000000", gradient: "from-gray-700 to-gray-900" },
                Other: { icon: "🌐", color: "#6B7280", gradient: "from-gray-500 to-gray-600" }
              };
              return styles[source] || styles.Other;
            };
            
            const style = getSourceStyle(item.source);
            
            return (
              <div 
                key={item.source} 
                className="relative overflow-hidden p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                      <span className="text-sm font-medium">{item.source}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                            style={{ width: `${percent}%`, backgroundColor: style.color }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{percent}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-accent-cyan text-lg font-bold">{item.clicks}</span>
                    <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-text-muted text-sm">No traffic sources yet</p>
            <p className="text-text-muted text-xs mt-2">Share your profile to see where your visitors come from</p>
          </div>
        )}
      </div>
    </GlassCard>
  </div>
)}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <GlassCard className="max-w-md w-full p-6 text-center">
            <h3 className="font-display text-xl md:text-2xl">✨ Upgrade to Pro</h3>
            <p className="mt-3 text-sm text-text-muted">
              Custom date ranges, CSV export, and advanced analytics are available on Pro and Business plans.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                type="button"
                className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan text-white font-medium text-sm"
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate("/dashboard/billing");
                }}
              >
                View Plans
              </button>
              <button
                type="button"
                className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl border border-white/15 text-white text-sm"
                onClick={() => setShowUpgradeModal(false)}
              >
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;