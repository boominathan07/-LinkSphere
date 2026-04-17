import GlassCard from "../components/ui/GlassCard";
import { useAdminAnalytics } from "../hooks/useAdmin";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminAnalytics();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-3xl">Platform Analytics</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-white">{data?.totalClicks || 0}</p>
          <p className="text-text-muted">Total Platform Clicks</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-white">{data?.totalUsers || 0}</p>
          <p className="text-text-muted">Total Users</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-white">{data?.totalLinks || 0}</p>
          <p className="text-text-muted">Total Links</p>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="font-display text-xl mb-4">Click Trends (30 Days)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.clickTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Area type="monotone" dataKey="clicks" stroke="#6C63FF" fill="#6C63FF33" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}