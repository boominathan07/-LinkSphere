import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Palette,
  Settings2,
  Shield,
  Tag,
  Users2,
  X,
  UserCog
} from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import DashboardProfileBanner from "./DashboardProfileBanner";
import CommandPalette from "./CommandPalette";

const SIDEBAR_COLLAPSED_KEY = "linksphere_sidebar_collapsed";

// User nav items (for regular users)
const userNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/links", label: "Links", icon: Link2 },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/audience", label: "Audience", icon: Users2 },
  { to: "/dashboard/appearance", label: "Appearance", icon: Palette },
  { to: "/dashboard/settings", label: "Settings", icon: Settings2 },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/pricing", label: "Pricing", icon: Tag, end: true }
];

// Admin nav items (only admin pages)
const adminNavItems = [
  { to: "/admin", label: "Admin Dashboard", icon: Shield, end: true },
  { to: "/admin/users", label: "Users", icon: Users2 },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings2 }
];

function planBadgeStyles(plan) {
  const p = String(plan || "free").toLowerCase();
  if (p === "pro") {
    return "border-accent-cyan/35 bg-accent-cyan/15 text-accent-cyan";
  }
  if (p === "business") {
    return "border-accent-gold/40 bg-accent-gold/15 text-accent-gold";
  }
  return "border-white/10 bg-white/5 text-text-muted";
}

function planLabel(plan) {
  const p = String(plan || "free").toLowerCase();
  if (p === "pro") return "Pro";
  if (p === "business") return "Business";
  return "Free";
}

function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Select nav items based on user role
  const navItems = user?.role === "admin" ? adminNavItems : userNavItems;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const onLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (_error) {
      // no-op
    }
    logout();
    navigate("/login");
  };

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Account";
  const showFullBranding = !collapsed || isMobileMenuOpen;
  const navLabelsHidden = collapsed && !isMobileMenuOpen;

  return (
    <div
      className={`relative grid min-h-screen grid-cols-1 bg-bg-base ${collapsed ? "md:grid-cols-[64px_minmax(0,1fr)]" : "md:grid-cols-[220px_minmax(0,1fr)]"}`}
    >
      <CommandPalette />
      <button
        className="fixed left-4 top-4 z-40 rounded-xl border border-white/15 bg-bg-surface/90 px-3 py-2 text-sm text-text-primary md:hidden"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        type="button"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
      </button>
      {isMobileMenuOpen ? (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex min-h-0 w-[220px] flex-col border-r border-border bg-surface transition-all duration-200 md:static md:min-h-screen ${
          collapsed ? "md:w-16" : "md:w-[220px]"
        } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className={`relative shrink-0 border-b border-border px-3 pb-4 pt-4 ${collapsed ? "md:px-2" : ""}`}>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute right-2 top-3 hidden h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-all duration-200 hover:bg-hover hover:text-text-primary md:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronRight size={18} strokeWidth={2} /> : <ChevronLeft size={18} strokeWidth={2} />}
          </button>

          {showFullBranding ? (
            <div className="pr-10">
              <h1 className="font-display text-lg font-bold leading-tight text-white">LinkSphere</h1>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-cyan">GROWTH TIER</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${planBadgeStyles(user?.plan)}`}
              >
                {planLabel(user?.plan)}
              </span>
            </div>
          ) : (
            <div className="hidden flex-col items-center gap-1 pt-1 md:flex">
              <span className="font-display text-sm font-bold leading-none text-white">LS</span>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${planBadgeStyles(user?.plan)}`}
              >
                {planLabel(user?.plan).charAt(0)}
              </span>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 border-l-[3px] py-2.5 pl-3 pr-2 transition-all duration-200",
                  navLabelsHidden ? "justify-center rounded-lg px-2" : "rounded-r-lg",
                  isActive
                    ? "border-accent-violet bg-accent-violet/20 text-white"
                    : "border-transparent text-text-muted hover:bg-hover hover:text-text-primary"
                ].join(" ")
              }
            >
              <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
              <span className={`truncate text-sm font-medium ${navLabelsHidden ? "md:sr-only" : ""}`}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div
          className={`mt-auto flex shrink-0 gap-2 border-t border-border px-3 py-3 ${
            navLabelsHidden ? "flex-col items-center md:px-2" : "flex-row items-center"
          }`}
        >
          <img
            src={user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E293B&color=F1F5F9&size=64`}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
          />
          {!navLabelsHidden ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
                <p className="text-xs text-text-muted capitalize">{user?.role === "admin" ? "Admin" : user?.plan || "Free"}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-all duration-200 hover:bg-hover hover:text-text-primary"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="hidden rounded-lg p-2 text-text-muted transition-all duration-200 hover:bg-hover hover:text-text-primary md:inline-flex"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </aside>

      <main className="w-full overflow-x-hidden p-4 pt-20 sm:p-5 md:p-8 md:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto w-full max-w-7xl"
        >
          <DashboardProfileBanner />
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

export default AppShell;