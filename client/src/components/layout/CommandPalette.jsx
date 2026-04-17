import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import toast from "react-hot-toast";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  FileDown,
  LayoutDashboard,
  Link2,
  LogOut,
  Palette,
  Search,
  Settings2,
  Users2
} from "lucide-react";
import api from "../../lib/api";
import { getPublicProfileHost } from "../../lib/publicProfileUrl";
import { useAuthStore } from "../../store/authStore";
import { useLinks } from "../../hooks/useLinks";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);
  const { data: links = [] } = useLinks();
  const isPro = user?.plan === "pro" || user?.plan === "business";

  const publicUrl = useMemo(() => {
    if (!user?.username) return "";
    return `${getPublicProfileHost()}/@${user.username}`;
  }, [user?.username]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const copyPublicUrl = () => {
    if (!publicUrl) {
      toast.error("Set a username first");
      return;
    }
    navigator.clipboard.writeText(publicUrl).then(() => toast.success("Profile URL copied"));
    setOpen(false);
  };

  const previewProfile = () => {
    if (!user?.username) {
      toast.error("No public profile yet");
      return;
    }
    window.open(`/${encodeURIComponent(user.username)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (_e) {
      // ignore
    }
    clearAuth();
    localStorage.removeItem("linksphere_session_id");
    setOpen(false);
    navigate("/login");
  };

  const downloadCsv = async () => {
    if (!isPro) {
      toast.error("CSV export is available on Pro");
      return;
    }
    try {
      const res = await api.get("/analytics/export/csv", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "linksphere-analytics.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (e) {
      toast.error(e?.response?.status === 403 ? "Pro required" : "Download failed");
    }
    setOpen(false);
  };

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links.slice(0, 8);
    return links.filter((l) => (l.title || "").toLowerCase().includes(q)).slice(0, 12);
  }, [links, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/65 px-3 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <Command
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/12 bg-bg-surface shadow-2xl shadow-black/60"
        label="Command menu"
        shouldFilter={false}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
          <Command.Input
            placeholder="Search navigation, links, or actions…"
            value={search}
            onValueChange={setSearch}
            className="w-full bg-transparent py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <kbd className="hidden shrink-0 rounded border border-white/15 bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-text-muted">No matches — try another search.</Command.Empty>

          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Navigation</div>
          <Command.Group>
            <Command.Item
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary aria-selected:bg-accent-violet/25"
              onSelect={() => go("/dashboard")}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/links")}>
              <Link2 className="h-4 w-4" /> Links
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/analytics")}>
              <BarChart3 className="h-4 w-4" /> Analytics
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/audience")}>
              <Users2 className="h-4 w-4" /> Audience
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/appearance")}>
              <Palette className="h-4 w-4" /> Appearance
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/settings")}>
              <Settings2 className="h-4 w-4" /> Settings
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/billing")}>
              <CreditCard className="h-4 w-4" /> Billing
            </Command.Item>
            {user?.role === "admin" ? (
              <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/admin")}>
                <Users2 className="h-4 w-4" /> Admin
              </Command.Item>
            ) : null}
          </Command.Group>

          <div className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Quick actions</div>
          <Command.Group>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={() => go("/dashboard/links?add=1")}>
              <Link2 className="h-4 w-4" /> Add new link
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={previewProfile}>
              <ExternalLink className="h-4 w-4" /> Preview profile
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={copyPublicUrl}>
              <Link2 className="h-4 w-4" /> Copy profile URL
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm" onSelect={downloadCsv}>
              <FileDown className="h-4 w-4" /> Download analytics CSV {isPro ? "" : "(Pro)"}
            </Command.Item>
            <Command.Item className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-300" onSelect={logout}>
              <LogOut className="h-4 w-4" /> Logout
            </Command.Item>
          </Command.Group>

          {filteredLinks.length ? (
            <>
              <div className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Your links</div>
              <Command.Group>
                {filteredLinks.map((link) => (
                  <Command.Item
                    key={link._id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
                    onSelect={() => go("/dashboard/links")}
                  >
                    <span className="truncate">{link.title || "Untitled"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          ) : null}
        </Command.List>
        <p className="border-t border-white/10 px-4 py-2 text-[11px] text-text-muted">
          <kbd className="rounded border border-white/10 px-1 font-mono">Ctrl</kbd> +{" "}
          <kbd className="rounded border border-white/10 px-1 font-mono">K</kbd> to toggle
        </p>
      </Command>
    </div>
  );
}
