import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3, Globe2, MonitorSmartphone, Users2 } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import { useAudienceAnalytics } from "../hooks/useAnalytics";
import { useAuthStore } from "../store/authStore";

function heatColor(intensity) {
  const t = Math.min(Math.max(intensity, 0), 1);
  const h = 210 - t * 165;
  const s = 70 + t * 25;
  const l = 28 + t * 22;
  return `hsl(${h} ${s}% ${l}%)`;
}

function SectionEmpty({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-bg-elevated/25 px-6 py-12 text-center">
      {Icon ? <Icon className="h-11 w-11 text-text-muted/45" strokeWidth={1.25} aria-hidden /> : null}
      <p className="mt-4 font-display text-lg text-text-primary">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-text-muted">{description}</p>
      {actionLabel && actionTo ? (
        <Link
          className="mt-5 rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-sm font-medium text-accent-cyan transition hover:bg-accent-cyan/20"
          to={actionTo}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function AudiencePage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError } = useAudienceAnalytics();
  const [selectedCountry, setSelectedCountry] = useState("");

  const countries = data?.countries || [];
  const citiesByCountry = data?.citiesByCountry || {};
  const selectedCities = selectedCountry ? citiesByCountry[selectedCountry] || [] : [];
  const matrixRows = data?.deviceOsMatrix || [];
  const peakHours = data?.peakHours || [];
  const newV = data?.visitors?.newVisitors ?? 0;
  const retV = data?.visitors?.returningVisitors ?? 0;

  const maxCountryClicks = countries[0]?.clicks || 0;
  const hasGeo = countries.some((c) => c.clicks > 0);
  const hasMatrix = matrixRows.some((r) => r.clicks > 0);
  const hasVisitors = newV + retV > 0;
  const topCountries = useMemo(() => countries.slice(0, 20), [countries]);

  const peakMap = useMemo(() => {
    const map = new Map();
    for (const item of peakHours) {
      map.set(`${item.dayOfWeek}-${item.hour}`, item.clicks);
    }
    return map;
  }, [peakHours]);

  const peakMax = useMemo(() => peakHours.reduce((max, item) => Math.max(max, item.clicks), 1), [peakHours]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, index) => index);

  const pieData = useMemo(
    () => [
      { name: "New", value: newV, fill: "#22d3ee" },
      { name: "Returning", value: retV, fill: "#8b5cf6" }
    ],
    [newV, retV]
  );

  const isProOrBiz = user?.plan === "pro" || user?.plan === "business";

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Audience Intelligence
        </h1>
        <GlassCard className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet"></div>
            <p className="ml-3 text-text-muted">Loading audience analytics…</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Audience Intelligence
        </h1>
        <GlassCard className="p-8">
          <SectionEmpty
            icon={BarChart3}
            title="Could not load audience data"
            description="Check your connection and try again. If the problem continues, try refreshing the page."
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Audience Intelligence
          </h1>
          <p className="text-text-muted mt-1">Understand your audience behavior and preferences</p>
        </div>
        {!isProOrBiz && (
          <Link
            to="/dashboard/billing"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan text-white text-sm font-medium hover:shadow-lg transition-all"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>

      {/* Geo Section */}
      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-display text-xl md:text-2xl">Top Countries</h2>
          </div>
          {!hasGeo ? (
            <SectionEmpty
              icon={Globe2}
              title="No geographic data yet"
              description="Share your profile and drive traffic to your links. Country breakdown appears once visitors start clicking."
              actionLabel="Share profile"
              actionTo="/dashboard"
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {topCountries.map((item, index) => {
                const intensity = maxCountryClicks ? item.clicks / maxCountryClicks : 0;
                const barColor = heatColor(intensity);
                return (
                  <button
                    key={`${item.country}-${index}`}
                    type="button"
                    onClick={() => setSelectedCountry(item.country)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selectedCountry === item.country
                        ? "border-accent-cyan bg-accent-cyan/20 shadow-lg shadow-accent-cyan/10"
                        : "border-white/10 bg-bg-elevated/60 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.flag || "🌍"}</span>
                        <p className="truncate font-medium">{item.country}</p>
                      </div>
                      <p className="shrink-0 text-accent-cyan font-semibold">{item.clicks} clicks</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(8, Math.round(intensity * 100))}%`,
                          background: `linear-gradient(90deg, ${heatColor(intensity * 0.45)} 0%, ${barColor} 100%)`
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-display text-xl md:text-2xl">City Breakdown</h2>
          </div>
          {!selectedCountry ? (
            <SectionEmpty
              icon={Globe2}
              title="Select a country"
              description="Click a country in the list on the left to see city-level clicks for that region."
            />
          ) : !selectedCities.length ? (
            <SectionEmpty
              title="No cities for this country"
              description="We may not have city-level data for every click yet."
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-text-muted">
                Cities for <span className="text-accent-cyan font-medium">{selectedCountry}</span>
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedCities.map((city, index) => (
                  <div
                    className="flex items-center justify-between rounded-xl bg-bg-elevated/60 px-4 py-3 hover:bg-white/5 transition-all"
                    key={`${city.city}-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <p className="truncate">{city.city}</p>
                    </div>
                    <p className="text-accent-cyan font-medium">{city.clicks} clicks</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Device × OS Matrix */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MonitorSmartphone className="w-5 h-5 text-accent-cyan" />
          <h2 className="font-display text-xl md:text-2xl">Device & OS Breakdown</h2>
        </div>
        {!hasMatrix ? (
          <SectionEmpty
            icon={MonitorSmartphone}
            title="No device breakdown yet"
            description="When visitors tap your links we record device and OS. Data will show up here after your first clicks."
            actionLabel="Manage links"
            actionTo="/dashboard/links"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-text-muted border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Operating System</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                 </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, index) => (
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-all" key={`${row.device}-${row.os}-${index}`}>
                    <td className="px-4 py-3 capitalize font-medium">{row.device}</td>
                    <td className="px-4 py-3">{row.os}</td>
                    <td className="px-4 py-3 text-right text-accent-cyan font-semibold">{row.clicks}</td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Peak Hours Heatmap */}
      <GlassCard className="p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-display text-xl md:text-2xl">Peak Hours Heatmap</h2>
          </div>
          {!isProOrBiz && (
            <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Pro Feature
            </span>
          )}
        </div>
        {!isProOrBiz ? (
          <div className="relative min-h-[280px]">
            <div className="pointer-events-none select-none space-y-2 opacity-30 blur-[4px]">
              {dayLabels.map((day, dayIndex) => (
                <div className="grid grid-cols-[56px_repeat(24,minmax(0,1fr))] gap-1" key={day}>
                  <p className="pt-1 text-xs text-text-muted">{day}</p>
                  {hours.map((hour) => (
                    <div key={`${day}-${hour}`} className="h-5 rounded bg-cyan-500/25" />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-bg-base/90 p-6 text-center backdrop-blur-md">
              <p className="font-display text-lg">Unlock Peak Hours Analysis</p>
              <p className="max-w-md text-sm text-text-muted">
                See which hours and days drive the most clicks. Upgrade to Pro to unlock this view.
              </p>
              <Link
                className="rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-violet/25 transition hover:brightness-110"
                to="/dashboard/billing"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            {dayLabels.map((day, dayIndex) => (
              <div className="grid grid-cols-[56px_repeat(24,minmax(0,1fr))] gap-1 min-w-[800px]" key={day}>
                <p className="pt-1 text-xs font-medium text-text-muted">{day}</p>
                {hours.map((hour) => {
                  const clicks = peakMap.get(`${dayIndex + 1}-${hour}`) || 0;
                  const intensity = peakMax ? Math.min(clicks / peakMax, 1) : 0;
                  const tooltipText = `${day} ${hour}:00 — ${clicks} clicks`;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="h-6 rounded-md transition-all duration-200 hover:scale-110 cursor-help"
                      title={tooltipText}
                      style={{
                        backgroundColor: `rgba(108, 99, 255, ${Math.max(intensity, 0.1)})`
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-white font-medium">{clicks > 0 ? clicks : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <p className="text-xs text-text-muted text-center mt-3">
              Darker color = more clicks | Hover to see exact numbers
            </p>
          </div>
        )}
      </GlassCard>

      {/* New vs Returning Visitors */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users2 className="w-5 h-5 text-accent-cyan" />
          <h2 className="font-display text-xl md:text-2xl">Visitor Loyalty</h2>
        </div>
        {!hasVisitors ? (
          <SectionEmpty
            icon={Users2}
            title="No session data yet"
            description="We classify visitors using session IDs from your public profile. Share your page to start collecting returning visitor signals."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-center">
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={96}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, "sessions"]}
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/5 border border-accent-cyan/20 p-4">
                <p className="text-sm text-text-muted">New Visitors</p>
                <p className="mt-1 text-3xl font-bold text-accent-cyan">{newV}</p>
                <p className="mt-2 text-xs text-text-muted">First-time visitors</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-violet/5 border border-accent-violet/20 p-4">
                <p className="text-sm text-text-muted">Returning Visitors</p>
                <p className="mt-1 text-3xl font-bold text-accent-violet">{retV}</p>
                <p className="mt-2 text-xs text-text-muted">Visitors who came back</p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default AudiencePage;