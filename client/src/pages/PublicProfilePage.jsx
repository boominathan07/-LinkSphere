import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiInstagram, FiTwitter, FiYoutube } from "react-icons/fi";
import { SiTiktok } from "react-icons/si";
import { motion } from "framer-motion";
import { ExternalLink, QrCode, Share2 } from "lucide-react";
import api from "../lib/api";
import NeonButton from "../components/ui/NeonButton";
import ProfileQrModal from "../components/ui/ProfileQrModal";
import { Link, useParams } from "react-router-dom";
import { getProfileTheme, themeGradientCSS } from "../lib/profileThemes";
import { getPublicPageBackground, getThemeAccent, isLightProfileTheme } from "../lib/publicProfileTheme";
import { getPublicProfilePageUrl } from "../lib/publicProfileUrl";

const SOCIAL_COLORS = {
  instagram: "#E4405F",
  youtube: "#FF0000",
  twitter: "#1D9BF0",
  tiktok: "#FFFFFF"
};

function PublicProfilePage() {
  const { username } = useParams();
  const normalizedUsername = String(username || "").replace(/^@+/, "").trim().toLowerCase();
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
const { data, error, isPending, isError, refetch } = useQuery({
  queryKey: ["public-profile", normalizedUsername],
  queryFn: async () => {
    const profile = await api.get(`/public/${normalizedUsername}`);
    return profile.data;
  },
  enabled: Boolean(normalizedUsername),
  staleTime: 0, // Don't cache
  cacheTime: 0, // Don't cache
});
  const errorStatus = error?.response?.status;

  const visitorSessionId = useMemo(() => {
    const key = "linksphere_public_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, generated);
    return generated;
  }, []);

  useEffect(() => {
    if (normalizedUsername) {
      api.post(`/public/view/${normalizedUsername}`).catch(() => {});
    }
  }, [normalizedUsername]);

  const onClickLink = async (link) => {
    await api.post(`/public/click/${link._id}`, { sessionId: visitorSessionId }).catch(() => {});
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const onCapture = async () => {
    if (!visitorEmail) return;
    await api.post(`/public/email/${normalizedUsername}`, { visitorEmail, visitorName }).catch(() => {});
    setVisitorName("");
    setVisitorEmail("");
    alert("Thanks for subscribing! 🎉");
  };

  const socialLinks = useMemo(() => {
    const links = data?.user?.socialLinks || {};
    return [
      { key: "instagram", href: links.instagram, Icon: FiInstagram, color: SOCIAL_COLORS.instagram },
      { key: "youtube", href: links.youtube, Icon: FiYoutube, color: SOCIAL_COLORS.youtube },
      { key: "twitter", href: links.twitter, Icon: FiTwitter, color: SOCIAL_COLORS.twitter },
      { key: "tiktok", href: links.tiktok, Icon: SiTiktok, color: SOCIAL_COLORS.tiktok }
    ].filter((item) => item.href);
  }, [data]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Profile link copied to clipboard! 📋");
    setShowShareMenu(false);
  };

  const user = data?.user;
  const isProOrBusiness = user?.plan === "pro" || user?.plan === "business";
  const showPoweredBy = user?.plan !== "business";
  const pageBg = user ? getPublicPageBackground(user) : { minHeight: "100vh", backgroundColor: "#0D0D1A" };
  const accent = user ? getThemeAccent(user) : "#6C63FF";
  const profileUrl = user ? getPublicProfilePageUrl(user.username || username) : "";

  const bioText = user?.bio ? String(user.bio).slice(0, 140) : "";

  if (errorStatus === 404) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
        <div className="w-full max-w-[480px] rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">This profile doesn&apos;t exist yet</h1>
          <p className="mt-3 text-sm text-text-muted">
            @{username} has not been created. Claim your LinkSphere page and launch your profile in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <NeonButton>Create your profile</NeonButton>
            </Link>
            <Link className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-text-primary transition hover:bg-white/10" to="/">
              Explore LinkSphere
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
        <div className="w-full max-w-[480px] rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">This account has been suspended</h1>
          <p className="mt-3 text-sm text-text-muted">
            This public profile is currently unavailable. If you believe this is a mistake, contact support.
          </p>
          <div className="mt-8">
            <Link to="/">
              <NeonButton>Go to LinkSphere</NeonButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isError && errorStatus !== 404 && errorStatus !== 403) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
        <div className="w-full max-w-[480px] rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <h1 className="font-display text-xl font-bold text-white">Couldn&apos;t load this profile</h1>
          <p className="mt-3 text-sm text-text-muted">Check your connection and try again.</p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-accent-violet px-5 py-2.5 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isPending && !data) {
    return (
      <div className="min-h-screen bg-base">
        <div className="mx-auto max-w-[480px] px-4 py-16">
          <div className="animate-pulse space-y-6">
            <div className="mx-auto h-24 w-24 rounded-full bg-white/10" />
            <div className="mx-auto h-6 max-w-[200px] rounded-lg bg-white/10" />
            <div className="mx-auto h-4 max-w-full rounded bg-white/5" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

 const user = data?.user;
const links = data?.links || [];

// ========== ADD THESE PROFILE SETTINGS ==========
const textColor = user?.textColor || "#FFFFFF";
const buttonColor = user?.buttonColor || "#6C63FF";
const customFont = user?.customFont || "geist";
const bodyFont = user?.bodyFont || "geist";
const buttonStyle = user?.buttonStyle || "rounded";
// ================================================
  const isLight = isLightProfileTheme(user);
  const themeDef = getProfileTheme(user.theme);
  const joinFg = ["#39ff14", "#ffd700"].includes(themeDef.button.toLowerCase()) ? "#0f172a" : "#ffffff";
  const coverScrim = isLight
    ? "linear-gradient(to bottom, rgba(15,23,42,0.25), rgba(15,23,42,0.88))"
    : "linear-gradient(to bottom, rgba(13,13,26,0.15), rgba(13,13,26,0.82))";


  const S = isLight
    ? {
        shell: "border-slate-300/45 shadow-xl shadow-slate-900/15",
        inner: "border-slate-300/35 bg-white/80",
        heading: "text-slate-900",
        bio: "text-slate-600",
        empty: "text-slate-500",
        socialBorder: "border-slate-300/70",
        socialBg: "bg-white/90",
        linkBtn: "border-slate-300/80 bg-slate-900/[0.06] text-slate-900 hover:bg-slate-900/11 backdrop-blur-md shadow-sm",
        linkExt: "text-slate-500",
        news: "border-slate-300/60 bg-white/70",
        newsTitle: "text-slate-900",
        input: "border-slate-300/80 bg-white text-slate-900 placeholder:text-slate-500 focus:border-teal-500/50",
        fab: "border-slate-400/50 bg-slate-900/90 text-white hover:bg-slate-800",
        footer: "text-slate-400"
      }
    : {
        shell: "border-white/10 shadow-2xl shadow-black/40",
        inner: "border-white/10 bg-white/[0.04]",
        heading: "text-white",
        bio: "text-text-muted",
        empty: "text-text-muted",
        socialBorder: "border-white/15",
        socialBg: "bg-white/5",
        linkBtn: "border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md shadow-sm",
        linkExt: "text-white/50",
        news: "border-white/15 bg-white/[0.06]",
        newsTitle: "text-white",
        input: "border-white/15 bg-white/5 text-text-primary placeholder:text-text-muted/80 focus:border-accent-cyan/40",
        fab: "border-white/20 bg-white/10 text-white hover:bg-white/20",
        footer: "text-white/30"
      };

  return (
    <div className="relative min-h-screen" style={pageBg}>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3 sm:right-6">
        <button
          type="button"
          aria-label="Share profile"
          className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 ${S.fab}`}
          onClick={() => setShowShareMenu(!showShareMenu)}
        >
          <Share2 className="h-5 w-5" strokeWidth={2} />
        </button>
        
        {isProOrBusiness && (
          <button
            type="button"
            aria-label="Show profile QR code"
            className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 ${S.fab}`}
            onClick={() => setShowQr(true)}
          >
            <QrCode className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Share Menu */}
      {showShareMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={() => setShowShareMenu(false)}>
          <div className="w-full max-w-[380px] rounded-2xl bg-surface p-5 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-white mb-3">Share this profile</h3>
            <button
              onClick={handleShare}
              className="w-full rounded-xl bg-accent-violet py-3 text-white font-medium transition hover:bg-accent-violet/80"
            >
              Copy profile link
            </button>
            <button
              onClick={() => setShowShareMenu(false)}
              className="w-full mt-2 rounded-xl border border-white/10 py-2.5 text-text-muted text-sm transition hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 pb-20 pt-6 sm:px-5">
        <div className={`overflow-hidden rounded-3xl border ${S.shell}`}>
          {/* Cover Image (Pro/Business) */}
          {isProOrBusiness && user?.customBgImage && (
            <div
              className="h-[180px] w-full bg-cover bg-center"
              style={{
                backgroundImage: `${coverScrim}, url(${user.customBgImage})`
              }}
            />
          )}
          
          {isProOrBusiness && !user?.customBgImage && (
            <div className="h-[180px] w-full" style={{ background: themeGradientCSS(themeDef) }} />
          )}

          <div
            className={`relative z-10 flex flex-col items-center px-4 pb-6 pt-6 backdrop-blur-xl sm:px-6 ${
              isProOrBusiness ? "-mt-12" : "pt-8"
            } ${S.inner}`}
          >
            {/* Avatar - NO BLINK ANIMATION */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className="flex items-center justify-center overflow-hidden rounded-full p-[2px]"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.2), ${accent})`
                  }}
                >
                  <img
                    alt="Profile"
                    className="h-20 w-20 rounded-full border-2 object-cover"
                    style={{ borderColor: `${accent}40` }}
                    src={user.profileImage || "https://placehold.co/100x100/1a1f2e/94a3b8?text=👤"}
                  />
                </div>
              </div>

            {/* Name with custom font and color */}
<h1 
  className={`mt-3 text-center font-display text-xl font-bold ${S.heading}`}
  style={{ 
    color: textColor,
    fontFamily: customFont === "geist" ? "'Geist', system-ui, sans-serif" : 
                customFont === "inter" ? "Inter, system-ui, sans-serif" :
                customFont === "poppins" ? "Poppins, system-ui, sans-serif" : 
                customFont === "space-grotesk" ? "'Space Grotesk', system-ui, sans-serif" : customFont
  }}
>
  {user.name || "Profile"}
</h1>

{/* Bio with body font and color */}
{bioText ? (
  <p 
    className={`mt-3 max-w-md text-center text-sm leading-relaxed ${S.bio}`}
    style={{ 
      color: textColor + "CC",
      fontFamily: bodyFont === "geist" ? "'Geist', system-ui, sans-serif" : 
                  bodyFont === "inter" ? "Inter, system-ui, sans-serif" : bodyFont
    }}
  >
    {bioText}
  </p>
) : (
  <p 
    className={`mt-3 max-w-md text-center text-sm italic ${S.bio}`}
    style={{ color: textColor + "99" }}
  >
    Welcome to my page! ✨
  </p>
)}
              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  {socialLinks.map(({ key, href, Icon, color }) => (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-base transition-all hover:scale-105 ${S.socialBorder} ${
                        key === "tiktok" ? "bg-black/50 text-white" : `${S.socialBg} hover:bg-white/15`
                      }`}
                      style={key === "tiktok" ? undefined : { color }}
                      aria-label={key}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>

      
            {/* Links - Linktree Style */}
<div className="mt-6 w-full space-y-2.5">
  {links.length === 0 ? (
    <p className={`py-6 text-center text-sm ${S.empty}`}>No links yet.</p>
  ) : (
    links.map((link, index) => (
      <motion.button
        key={link._id}
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        onClick={() => onClickLink(link)}
        className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: buttonColor,
          color: "#fff",
          borderColor: "rgba(255,255,255,0.1)",
          borderRadius: buttonStyle === "pill" 
            ? "9999px" 
            : buttonStyle === "square" 
            ? "0px" 
            : buttonStyle === "soft" 
            ? "1rem" 
            : "0.75rem"
        }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm leading-none bg-black/10">
          {link.thumbnailImage ? (
            <img 
              src={link.thumbnailImage} 
              alt="" 
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span role="img" aria-label="link icon">
              {link.icon || "🔗"}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-center">{link.title}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      </motion.button>
    ))
  )}
</div>

            {/* Bottom Join Button */}
            {/* Bottom Join Button */}
<div className="mt-6 w-full">
  <button
    onClick={() => window.open(`/${user.username}`, "_blank")}
    className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:scale-[1.01]`}
    style={{
      backgroundColor: buttonColor,
      color: "#fff",
      borderColor: "rgba(255,255,255,0.2)",
      borderRadius: buttonStyle === "pill" ? "9999px" : 
                  buttonStyle === "square" ? "0px" : 
                  buttonStyle === "soft" ? "1rem" : "0.75rem"
    }}
  >
    <span>✨ Join {user.name?.split(" ")[0] || user.username} on LinkSphere</span>
  </button>
</div>

            {/* Newsletter (Pro/Business) */}
            {isProOrBusiness && (
              <div className={`mt-6 w-full rounded-2xl border p-4 backdrop-blur-md ${S.news}`}>
                <h2 className={`text-center font-display text-base font-semibold ${S.newsTitle}`}>
                  📧 Get updates
                </h2>
                <div className="mt-3 grid gap-2">
                  <input
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${S.input}`}
                    placeholder="Your name"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                  />
                  <input
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${S.input}`}
                    placeholder="Email address"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    type="email"
                  />
                </div>
                <button
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold shadow-md transition hover:brightness-110"
                  style={{ backgroundColor: accent, color: joinFg }}
                  onClick={onCapture}
                  type="button"
                >
                  Subscribe ✨
                </button>
              </div>
            )}

            {/* Footer Links */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <span className={`text-[10px] cursor-pointer transition hover:opacity-70 ${S.footer}`}>
                Cookie Preferences
              </span>
              <span className={`text-[10px] cursor-pointer transition hover:opacity-70 ${S.footer}`}>
                Report
              </span>
              <span className={`text-[10px] cursor-pointer transition hover:opacity-70 ${S.footer}`}>
                Privacy
              </span>
            </div>
          </div>
        </div>

        {/* Powered by */}
        {showPoweredBy ? (
          <p className="mt-6 pb-4 text-center text-[10px] font-medium">
            <span className="bg-gradient-to-r from-accent-violet via-accent-cyan to-accent-violet bg-clip-text text-transparent">
              Powered by LinkSphere
            </span>
          </p>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* QR Modal */}
      <ProfileQrModal
        open={showQr}
        onClose={() => setShowQr(false)}
        profileUrl={profileUrl}
        username={user.username || username}
      />
    </div>
  );
}

export default PublicProfilePage;