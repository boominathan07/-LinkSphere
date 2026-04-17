import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Users, UserPlus, Crown, Briefcase, IndianRupee, 
  TrendingDown, TrendingUp, Activity, Shield, 
  Eye, MousePointer, Calendar, Search, Filter,
  ChevronLeft, ChevronRight, Download
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import {
  useAdminActionTypes,
  useAdminAnalytics,
  useAdminAuditLog,
  useAdminList,
  useAdminStats,
  useAdminUsersQuery,
  useDeleteUser,
  useSetUserPlan,
  useToggleUserBlock
} from "../hooks/useAdmin";

const COLORS = ["#6C63FF", "#00D4FF", "#39FF14", "#FFD700", "#FF3CAC"];

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("joined");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [auditAdmin, setAuditAdmin] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  const { data: overview } = useAdminStats();
  const { data: usersPayload } = useAdminUsersQuery({ search, filter, sortBy, sortOrder, page, limit: 20 });
  const { data: analytics } = useAdminAnalytics();
  const { data: admins = [] } = useAdminList();
  const { data: actionTypes = [] } = useAdminActionTypes();
  const { data: auditLogs = [] } = useAdminAuditLog({
    adminId: auditAdmin || undefined,
    action: auditAction || undefined,
    from: auditFrom || undefined,
    to: auditTo || undefined
  });
  const setPlan = useSetUserPlan();
  const toggleBlock = useToggleUserBlock();
  const removeUser = useDeleteUser();

  const users = usersPayload?.items || [];
  const pages = usersPayload?.pages || 1;

  const kpis = useMemo(
    () => [
      { label: "Total Users", value: overview?.totalUsers ?? 0, icon: Users, color: "from-violet-500 to-purple-600" },
      { label: "New Today", value: overview?.newToday ?? 0, icon: UserPlus, color: "from-cyan-500 to-blue-600" },
      { label: "Pro Users", value: overview?.proUsers ?? 0, icon: Crown, color: "from-emerald-500 to-green-600" },
      { label: "Business Users", value: overview?.businessUsers ?? 0, icon: Briefcase, color: "from-amber-500 to-orange-600" },
      { label: "MRR (₹)", value: overview?.mrr ?? 0, icon: IndianRupee, color: "from-rose-500 to-pink-600" },
      { label: "Churn %", value: overview?.churn ?? 0, icon: TrendingDown, color: "from-red-500 to-rose-600" }
    ],
    [overview]
  );

  const getPlanBadge = (plan) => {
    switch(plan) {
      case "pro": return "bg-gradient-to-r from-accent-cyan to-blue-500 text-white";
      case "business": return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
      default: return "bg-gray-500/20 text-gray-300";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-text-muted mt-1">Platform overview and user management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-accent-violet/20 px-3 py-1 text-sm text-accent-violet">
            <Activity className="h-3 w-3 inline mr-1" /> Live
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "users", label: "Users", icon: Users },
          { id: "analytics", label: "Analytics", icon: TrendingUp },
          { id: "audit", label: "Audit Log", icon: Shield }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
              tab.id === activeTab 
                ? "bg-gradient-to-r from-accent-violet to-accent-cyan text-white shadow-lg" 
                : "text-text-muted hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((item) => (
              <GlassCard key={item.label} className="p-4 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl bg-gradient-to-r ${item.color} opacity-20`} />
                <div className="relative">
                  <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${item.color} bg-opacity-20`}>
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white mt-2">{item.value.toLocaleString()}</p>
                  <p className="text-xs text-text-muted">{item.label}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">New Signups (30 Days)</h2>
                <TrendingUp className="h-4 w-4 text-accent-lime" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview?.signupTrend || []}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "none" }} />
                    <Area type="monotone" dataKey="users" stroke="#6C63FF" strokeWidth={2} fill="url(#signupGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">Revenue by Plan</h2>
                <IndianRupee className="h-4 w-4 text-accent-gold" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Pro", value: overview?.proUsers * 299 || 0 },
                        { name: "Business", value: overview?.businessUsers * 799 || 0 }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      label
                    >
                      <Cell fill="#6C63FF" />
                      <Cell fill="#00D4FF" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Lists Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-accent-rose" />
                <h2 className="font-display text-xl">Flagged Accounts</h2>
              </div>
              <div className="space-y-2">
                {(overview?.flaggedAccounts || []).length === 0 ? (
                  <p className="text-text-muted text-center py-8">No flagged accounts</p>
                ) : (
                  (overview?.flaggedAccounts || []).map((item) => (
                    <div key={item._id} className="flex items-center justify-between rounded-lg bg-bg-elevated/50 px-4 py-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-text-muted">{item.email}</p>
                      </div>
                      <span className="text-xs text-accent-rose">Blocked</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-accent-gold" />
                <h2 className="font-display text-xl">Pending Verifications</h2>
              </div>
              <div className="space-y-2">
                {(overview?.pendingVerifications || []).length === 0 ? (
                  <p className="text-text-muted text-center py-8">All users verified</p>
                ) : (
                  (overview?.pendingVerifications || []).map((item) => (
                    <div key={item._id} className="flex items-center justify-between rounded-lg bg-bg-elevated/50 px-4 py-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-text-muted">{item.email}</p>
                      </div>
                      <span className="text-xs text-accent-gold">Pending</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <GlassCard className="p-6">
          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 py-2 pl-10 pr-4 text-sm outline-none focus:border-accent-violet"
                placeholder="Search name/email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm outline-none" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="blocked">Blocked</option>
            </select>
            <select className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="joined">Joined Date</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="plan">Plan</option>
              <option value="links">Links Count</option>
              <option value="clicks">Clicks Count</option>
            </select>
            <select className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm outline-none" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="text-text-muted border-b border-white/10">
                <tr>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Links</th>
                  <th className="px-3 py-3">Clicks</th>
                  <th className="px-3 py-3">Joined</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=6C63FF&color=fff`}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <span className="font-medium">{user.name || "No name"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-text-muted">{user.email}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPlanBadge(user.plan)}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-3 py-3">{user.linksCount || 0}</td>
                    <td className="px-3 py-3">{user.clicksCount || 0}</td>
                    <td className="px-3 py-3 text-text-muted text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs ${user.isBlocked ? 'text-accent-rose' : 'text-accent-lime'}`}>
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Link className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition" to={`/admin/users/${user._id}`}>
                          View
                        </Link>
                        <button className="rounded-lg bg-accent-cyan/20 px-2 py-1 text-xs text-accent-cyan hover:bg-accent-cyan/30 transition" onClick={async () => { await setPlan.mutateAsync({ userId: user._id, plan: "pro" }); toast.success("Plan changed to Pro"); }}>
                          Pro
                        </button>
                        <button className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/30 transition" onClick={async () => { await setPlan.mutateAsync({ userId: user._id, plan: "business" }); toast.success("Plan changed to Business"); }}>
                          Biz
                        </button>
                        <button className={`rounded-lg px-2 py-1 text-xs transition ${user.isBlocked ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`} onClick={async () => { await toggleBlock.mutateAsync(user._id); toast.success(user.isBlocked ? "User unblocked" : "User blocked"); }}>
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30 transition" onClick={async () => { if (confirm("Delete this user?")) { await removeUser.mutateAsync(user._id); toast.success("User deleted"); } }}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <p className="text-sm text-text-muted">
                Page {usersPayload?.page || 1} of {pages}
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm disabled:opacity-50 hover:bg-white/5 transition"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm disabled:opacity-50 hover:bg-white/5 transition"
                  disabled={page >= pages}
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Platform Click Trends</h2>
              <MousePointer className="h-4 w-4 text-accent-cyan" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.clickTrend || []}>
                  <defs>
                    <linearGradient id="clickTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "none" }} />
                  <Area type="monotone" dataKey="clicks" stroke="#00D4FF" strokeWidth={2} fill="url(#clickTrendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="h-5 w-5 text-accent-gold" />
                <h2 className="font-display text-xl">Top 10 Links (Global)</h2>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(analytics?.topLinks || []).length === 0 ? (
                  <p className="text-text-muted text-center py-8">No links yet</p>
                ) : (
                  (analytics?.topLinks || []).map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-bg-elevated/50 px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-accent-gold w-6">#{idx + 1}</span>
                        <span className="truncate max-w-[200px]">{item.title}</span>
                      </div>
                      <span className="text-accent-cyan font-medium">{item.clicks} clicks</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-accent-cyan" />
                <h2 className="font-display text-xl">Top Users by Traffic</h2>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(analytics?.topUsers || []).length === 0 ? (
                  <p className="text-text-muted text-center py-8">No user data yet</p>
                ) : (
                  (analytics?.topUsers || []).map((item, idx) => (
                    <div key={item.userId} className="flex items-center justify-between rounded-lg bg-bg-elevated/50 px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-accent-cyan w-6">#{idx + 1}</span>
                        <span className="truncate max-w-[200px]">{item.name || item.email || item.userId}</span>
                      </div>
                      <span className="text-accent-cyan font-medium">{item.clicks} clicks</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-accent-cyan" />
              <h2 className="font-display text-xl">Country Distribution</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(analytics?.topCountries || []).map((item) => (
                <div key={item.country} className="flex items-center justify-between rounded-lg bg-bg-elevated/50 px-4 py-2">
                  <span>{item.country || "Unknown"}</span>
                  <span className="text-accent-cyan">{item.clicks} clicks</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <GlassCard className="p-6">
          {/* Audit Filters */}
          <div className="grid gap-3 md:grid-cols-4 mb-6">
            <select className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm outline-none" value={auditAdmin} onChange={(e) => setAuditAdmin(e.target.value)}>
              <option value="">All Admins</option>
              {admins.map((admin) => (
                <option key={admin._id} value={admin._id}>{admin.name || admin.email}</option>
              ))}
            </select>
            <select className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm outline-none" value={auditAction} onChange={(e) => setAuditAction(e.target.value)}>
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <input className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm" type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} placeholder="From" />
            <input className="rounded-xl border border-white/10 bg-bg-elevated/60 px-3 py-2 text-sm" type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} placeholder="To" />
          </div>

          {/* Audit Logs List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No audit records found</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log._id} className="rounded-xl border border-white/10 bg-bg-elevated/50 p-4 hover:bg-white/5 transition-all">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm">
                        <span className="text-accent-cyan font-medium">{log.action}</span>
                        <span className="text-text-muted"> by </span>
                        <span className="text-white">{log.adminId}</span>
                      </p>
                      {log.targetUserId && (
                        <p className="text-xs text-text-muted mt-1">Target User: {log.targetUserId}</p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-text-muted mt-1">Details: {JSON.stringify(log.details)}</p>
                      )}
                    </div>
                    <p className="text-xs text-text-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

export default AdminDashboardPage;