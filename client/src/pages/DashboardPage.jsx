import { useMemo } from "react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { 
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, 
  Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart,
  Legend
} from "recharts";
import { Monitor, Smartphone, Tablet, Globe, MousePointer, Eye, TrendingUp, Link2, Users, Zap } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import { ChartEmpty, ChartError, ChartSkeleton } from "../components/dashboard/ChartStates";
import {
  useDeviceAnalytics,
  useGeoAnalytics,
  usePerLinkAnalytics,
  useRecentActivity,
  useReferrerAnalytics,
  useSummary,
  useWeekly
} from "../hooks/useAnalytics";

const STAT_STRIPE = {
  violet: "bg-accent-violet",
  cyan: "bg-accent-cyan", 
  lime: "bg-accent-lime",
  gold: "bg-accent-gold",
  rose: "bg-accent-rose"
};

const DEVICE_COLORS = ["#6C63FF", "#00D4FF", "#39FF14", "#FFD700"];
const TOP_LINK_GRADIENTS = ["#6C63FF", "#8B74FF", "#A885FF", "#C496FF", "#E0A7FF"];

function formatWow(pct) {
  if (pct == null || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function buildSevenDaySeries(points) {
  const map = Object.fromEntries((points || []).map((p) => [p.day, p.clicks]));
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, "yyyy-MM-dd");
    out.push({
      label: format(d, "EEE"),
      clicks: map[key] ?? 0,
      key,
      fullDate: format(d, "MMM dd")
    });
  }
  return out;
}

function getCountryDisplay(code) {
  if (!code || code === 'Unknown' || code === 'unknown') return 'Unknown';
  const countries = {
    'US': 'United States', 'IN': 'India', 'GB': 'United Kingdom', 'CA': 'Canada',
    'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'JP': 'Japan',
    'BR': 'Brazil', 'MX': 'Mexico', 'ES': 'Spain', 'IT': 'Italy'
  };
  return countries[code] || code;
}

function getFlag(country = "") {
  const code = String(country).trim().toUpperCase();
  const flags = {
    'US': '🇺🇸', 'IN': '🇮🇳', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'JP': '🇯🇵', 'BR': '🇧🇷', 'MX': '🇲🇽'
  };
  return flags[code] || '🌍';
}

function DeviceIcon({ device }) {
  const d = String(device || "").toLowerCase();
  if (d === "mobile") return <Smartphone className="h-4 w-4 text-accent-cyan" />;
  if (d === "tablet") return <Tablet className="h-4 w-4 text-accent-gold" />;
  return <Monitor className="h-4 w-4 text-text-muted" />;
}

// Custom Tooltip for Top Links Horizontal Bar Graph
const CustomTopLinksTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-accent-violet/30 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-semibold text-white">{payload[0].payload.title}</p>
        <p className="text-xs text-gray-400 mt-1">Clicks: <span className="text-accent-cyan font-medium">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Device Split
const CustomDeviceTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-accent-violet/30 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-semibold text-white capitalize">{payload[0].name}</p>
        <p className="text-xs text-gray-400 mt-1">Clicks: <span className="text-accent-cyan font-medium">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const summaryQuery = useSummary();
  const weeklyQuery = useWeekly();
  const perLinkQuery = usePerLinkAnalytics();
  const devicesQuery = useDeviceAnalytics();
  const geoQuery = useGeoAnalytics();
  const referrersQuery = useReferrerAnalytics();
  const recentQuery = useRecentActivity();

  const s = summaryQuery.data;
  
  const weeklyChartData = useMemo(() => buildSevenDaySeries(weeklyQuery.data), [weeklyQuery.data]);
  
  // Top Links Data for Horizontal Bar Graph
  const topLinksData = useMemo(() => {
    const items = (perLinkQuery.data || []).slice(0, 5);
    return items.map((link, idx) => ({
      ...link,
      fill: TOP_LINK_GRADIENTS[idx % TOP_LINK_GRADIENTS.length]
    }));
  }, [perLinkQuery.data]);

  const deviceChartData = useMemo(() => {
    const items = devicesQuery.data || [];
    return items.map((d) => ({ 
      name: d.device || "unknown", 
      value: d.clicks || 0
    }));
  }, [devicesQuery.data]);

  const geoTop5 = useMemo(() => {
    const countries = geoQuery.data?.countries || [];
    return countries.slice(0, 5);
  }, [geoQuery.data]);

  const referrerTop = useMemo(() => {
    const referrers = referrersQuery.data || [];
    return referrers.slice(0, 5);
  }, [referrersQuery.data]);

  const getReferrerName = (ref) => {
    if (!ref || ref === 'direct') return 'Direct';
    if (ref.includes('instagram')) return 'Instagram';
    if (ref.includes('twitter')) return 'Twitter';
    if (ref.includes('facebook')) return 'Facebook';
    if (ref.includes('youtube')) return 'YouTube';
    return ref.split('/')[2] || ref;
  };

  const stats = [
    { label: "Total Clicks", value: s?.totalClicks ?? 0, sub: formatWow(s?.clicksWowPct), stripe: STAT_STRIPE.violet, icon: MousePointer },
    { label: "Profile Views", value: s?.views ?? 0, sub: formatWow(s?.viewsWowPct), stripe: STAT_STRIPE.cyan, icon: Eye },
    { label: "CTR %", value: s?.ctr != null ? `${s.ctr}%` : "0%", sub: "Updated this week", stripe: STAT_STRIPE.lime, icon: TrendingUp },
    { label: "Active Links", value: s?.activeLinksCount ?? 0, sub: "Currently running", stripe: STAT_STRIPE.gold, icon: Link2 },
    { label: "Subscribers", value: s?.subscriberCount ?? 0, sub: "Email captured", stripe: STAT_STRIPE.rose, icon: Users },
  ];

  const trafficEmpty = weeklyChartData.length > 0 && weeklyChartData.every((d) => d.clicks === 0);
  const topLinksEmpty = !topLinksData.length || topLinksData.every((l) => !l.clicks);
  const deviceEmpty = !deviceChartData.length;
  const geoEmpty = !geoTop5.length;
  const refEmpty = !referrerTop.length;
  const recentEmpty = !(recentQuery.data || []).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <p className="mt-2 text-text-muted">Performance snapshot for your public profile and links.</p>
      </header>

      {/* Stats Cards */}
      {summaryQuery.isError ? (
        <ChartError message="Failed to load stats." onRetry={() => summaryQuery.refetch()} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm group hover:border-accent-violet/30 transition-all"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${item.stripe} opacity-20`} />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${item.stripe} bg-opacity-20`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  {item.sub && item.sub !== "—" && item.sub !== "0%" && (
                    <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                      {item.sub}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-white">
                  {summaryQuery.isLoading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-white/10" /> : item.value}
                </p>
                <p className="text-xs text-text-muted mt-1">{item.label}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Traffic Trends - Area Chart */}
        <GlassCard className="min-h-[400px]">
          <h2 className="font-display text-xl md:text-2xl">Traffic Trends</h2>
          <p className="mt-1 text-sm text-text-muted">Last 7 days (clicks)</p>
          <div className="mt-4 h-72">
            {weeklyQuery.isLoading ? (
              <ChartSkeleton />
            ) : weeklyQuery.isError ? (
              <ChartError onRetry={() => weeklyQuery.refetch()} />
            ) : trafficEmpty ? (
              <ChartEmpty title="No traffic this week" description="Share your profile to start seeing daily click trends." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyChartData}>
                  <defs>
                    <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(108,99,255,0.3)", borderRadius: "8px" }}
                  />
                  <Area type="monotone" dataKey="clicks" stroke="#6C63FF" strokeWidth={2} fill="url(#clickGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Top Links - HORIZONTAL BAR GRAPH */}
       <GlassCard className="min-h-[400px]">
  <h2 className="font-display text-xl md:text-2xl">Top Links</h2>
  <p className="mt-1 text-sm text-text-muted">Most clicked this week</p>
  <div className="mt-4 h-72">
    {perLinkQuery.isLoading ? (
      <ChartSkeleton />
    ) : perLinkQuery.isError ? (
      <ChartError onRetry={() => perLinkQuery.refetch()} />
    ) : topLinksEmpty ? (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Zap className="w-12 h-12 text-text-muted opacity-30 mb-3" />
        <p className="text-text-muted">No link clicks yet</p>
        <p className="text-text-muted text-sm mt-1">Share your links to see top performers</p>
      </div>
    ) : (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={topLinksData} 
          margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="topLinksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="title" 
            stroke="#94A3B8" 
            fontSize={11} 
            tickLine={false}
            angle={-25}
            textAnchor="end"
            height={60}
            tickFormatter={(v) => v.length > 10 ? `${v.substring(0, 10)}...` : v}
          />
          <YAxis 
            stroke="#94A3B8" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip content={<CustomTopLinksTooltip />} />
          <Area 
            type="monotone" 
            dataKey="clicks" 
            stroke="#6C63FF" 
            strokeWidth={2} 
            fill="url(#topLinksGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    )}
  </div>
</GlassCard>
      </div>

      {/* Analytics Grid */}
        {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Split */}
        <GlassCard>
          <h2 className="font-display text-xl md:text-2xl">Device Split</h2>
          <p className="mt-1 text-sm text-text-muted">How visitors access your links</p>
          <div className="mt-4">
            {devicesQuery.isLoading ? (
              <ChartSkeleton />
            ) : devicesQuery.isError ? (
              <ChartError onRetry={() => devicesQuery.refetch()} />
            ) : deviceEmpty ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Monitor className="w-12 h-12 text-text-muted opacity-30 mb-3" />
                <p className="text-text-muted text-sm">No device data yet</p>
                <p className="text-text-muted text-xs mt-1">Data appears when visitors click your links</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomDeviceTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                                    height={40}
                    formatter={(value) => <span className="text-xs text-gray-400 capitalize">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Device Stats List */}
          {!deviceEmpty && deviceChartData.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-center gap-4 flex-wrap">
              {deviceChartData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DEVICE_COLORS[idx % DEVICE_COLORS.length] }} />
                  <span className="text-xs text-gray-400 capitalize">{item.name}</span>
                  <span className="text-xs font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Top Locations */}
        <GlassCard>
          <h2 className="font-display text-xl md:text-2xl">Top Locations</h2>
          <p className="mt-1 text-sm text-text-muted">Where your audience is</p>
          <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {geoQuery.isLoading ? (
              <ChartSkeleton />
            ) : geoQuery.isError ? (
              <ChartError onRetry={() => geoQuery.refetch()} />
            ) : geoEmpty ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="w-12 h-12 text-text-muted opacity-30 mb-3" />
                <p className="text-text-muted text-sm">No location data yet</p>
                <p className="text-text-muted text-xs mt-1">Data appears when visitors click from different countries</p>
              </div>
            ) : (
              geoTop5.map((item) => (
                <div key={item.country} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{getFlag(item.country)}</span>
                    <span className="text-sm text-gray-300 truncate">{getCountryDisplay(item.country)}</span>
                  </div>
                  <span className="text-sm font-medium text-accent-cyan flex-shrink-0 ml-2">{item.clicks} clicks</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Traffic Sources */}
        <GlassCard>
          <h2 className="font-display text-xl md:text-2xl">Traffic Sources</h2>
          <p className="mt-1 text-sm text-text-muted">Where visitors come from</p>
          <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {referrersQuery.isLoading ? (
              <ChartSkeleton />
            ) : referrersQuery.isError ? (
              <ChartError onRetry={() => referrersQuery.refetch()} />
            ) : refEmpty ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="w-12 h-12 text-text-muted opacity-30 mb-3" />
                <p className="text-text-muted text-sm">No referrer data yet</p>
                <p className="text-text-muted text-xs mt-1">Data appears when visitors come from other sites</p>
              </div>
            ) : (
              referrerTop.map((item) => (
                <div key={item.referrer} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-accent-violet flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{getReferrerName(item.referrer)}</span>
                  </div>
                  <span className="text-sm font-medium text-accent-cyan flex-shrink-0 ml-2">{item.clicks} clicks</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
      {/* Recent Activity */}
      <GlassCard>
        <h2 className="mb-1 font-display text-xl md:text-2xl">Recent Activity</h2>
        <p className="text-sm text-text-muted">Latest link clicks in real-time</p>
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {recentQuery.isLoading ? (
            <ChartSkeleton />
          ) : recentQuery.isError ? (
            <ChartError onRetry={() => recentQuery.refetch()} />
          ) : recentEmpty ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-text-muted opacity-30 mx-auto mb-3" />
              <p className="text-text-muted">No recent clicks yet</p>
              <p className="text-text-muted text-sm mt-1">Share your profile and watch the activity appear</p>
            </div>
          ) : (
            (recentQuery.data || []).map((row) => (
              <div key={row._id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-accent-violet/30 transition-all">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-2xl">{getFlag(row.country)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{row.linkTitle || 'Link Click'}</p>
                    <p className="text-xs text-gray-500">
                      {getCountryDisplay(row.country)}
                      {row.referrer && row.referrer !== 'direct' && ` • ${getReferrerName(row.referrer)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DeviceIcon device={row.device} />
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {row.createdAt ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: true }) : '—'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}