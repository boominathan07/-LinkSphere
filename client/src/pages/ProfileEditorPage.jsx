import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HexColorPicker } from "react-colorful";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FiInstagram, FiTwitter, FiYoutube } from "react-icons/fi";
import { SiTiktok } from "react-icons/si";
import { Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import { useLinks } from "../hooks/useLinks";
import { useProfileSettings, useUpdateProfileSettings } from "../hooks/useSettings";
import { PROFILE_THEMES, getProfileTheme, themeGradientCSS } from "../lib/profileThemes";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";

const themePresets = PROFILE_THEMES.map((t) => ({
  id: t.id,
  label: t.label,
  gradient: themeGradientCSS(t)
}));

const BUTTON_PRESETS = [
  { id: "pill", label: "Pill" },
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Square" },
  { id: "soft", label: "Soft" },
  { id: "neon", label: "Neon" },
  { id: "glass", label: "Glass" }
];

const headingFonts = ["geist", "space-grotesk", "inter", "sora", "poppins", "manrope", "dm-sans", "rubik"];
const bodyFonts = ["geist", "inter", "manrope", "dm-sans", "public-sans", "outfit", "poppins", "rubik"];

const FONT_PREVIEW = {
  geist: "'Geist', system-ui, sans-serif",
  "space-grotesk": "'Space Grotesk', system-ui, sans-serif",
  inter: "Inter, system-ui, sans-serif",
  sora: "Sora, system-ui, sans-serif",
  poppins: "Poppins, system-ui, sans-serif",
  manrope: "Manrope, system-ui, sans-serif",
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  rubik: "Rubik, system-ui, sans-serif",
  "public-sans": "'Public Sans', system-ui, sans-serif",
  outfit: "Outfit, system-ui, sans-serif"
};

function previewButtonClass(style) {
  const base = "flex w-full items-center justify-center border px-3 py-2.5 text-center text-sm font-semibold transition";
  switch (style) {
    case "pill":
      return `${base} rounded-full`;
    case "square":
      return `${base} rounded-none`;
    case "soft":
      return `${base} rounded-2xl shadow-lg shadow-black/30`;
    case "neon":
      return `${base} rounded-xl ring-2 shadow-[0_0_22px_rgba(34,211,238,0.35)]`;
    case "glass":
      return `${base} rounded-xl border-white/25 bg-white/10 backdrop-blur-md`;
    case "rounded":
    default:
      return `${base} rounded-xl`;
  }
}

function contrastText(hex) {
  if (!hex || typeof hex !== "string") return "#ffffff";
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return "#ffffff";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

function socialIcon(platform) {
  const cls = "h-5 w-5";
  if (platform === "instagram") return <FiInstagram className={cls} />;
  if (platform === "youtube") return <FiYoutube className={cls} />;
  if (platform === "twitter") return <FiTwitter className={cls} />;
  return <SiTiktok className={cls} />;
}

function ProfileEditorPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { data: profile } = useProfileSettings();
  const { data: links = [] } = useLinks();
  const updateSettings = useUpdateProfileSettings();

  const isPro = user?.plan === "pro" || user?.plan === "business";

  const [form, setForm] = useState({
    name: "",
    bio: "",
    profileImage: "",
    socialLinks: { instagram: "", youtube: "", twitter: "", tiktok: "" },
    theme: "obsidian-pulse",
    customBgColor: "#0D0D1A",
    customBgImage: "",
    customFont: "geist",
    bodyFont: "geist",
    buttonStyle: "rounded",
    buttonColor: "#6C63FF",
    textColor: "#FFFFFF",
    animationStyle: "none"
  });

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      name: profile.name || "",
      bio: profile.bio || "",
      profileImage: profile.profileImage || "",
      socialLinks: {
        instagram: profile.socialLinks?.instagram || "",
        youtube: profile.socialLinks?.youtube || "",
        twitter: profile.socialLinks?.twitter || "",
        tiktok: profile.socialLinks?.tiktok || ""
      },
      theme: profile.theme || prev.theme,
      customBgColor: profile.customBgColor || prev.customBgColor,
      customBgImage: profile.customBgImage || "",
      customFont: profile.customFont || "geist",
      bodyFont: profile.bodyFont || profile.customFont || "geist",
      buttonStyle: profile.buttonStyle || "rounded",
      buttonColor: profile.buttonColor || getProfileTheme(profile.theme).button,
      textColor: profile.textColor || "#FFFFFF",
      animationStyle: profile.animationStyle || "none"
    }));
  }, [profile]);

  const previewLinks = useMemo(() => links.slice(0, 5), [links]);

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/profile/avatar", fd);
      return data.user;
    },
    onSuccess: (nextUser) => {
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      if (nextUser?.profileImage) {
        setForm((prev) => ({ ...prev, profileImage: nextUser.profileImage }));
      }
      if (nextUser) setAuth({ user: { ...user, ...nextUser }, accessToken: useAuthStore.getState().accessToken });
      toast.success("Avatar uploaded");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Avatar upload failed");
    }
  });

  const uploadCoverMutation = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/profile/cover", fd);
      return data.user;
    },
    onSuccess: (nextUser) => {
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      if (nextUser?.customBgImage) {
        setForm((prev) => ({ ...prev, customBgImage: nextUser.customBgImage }));
      }
      if (nextUser) setAuth({ user: { ...user, ...nextUser }, accessToken: useAuthStore.getState().accessToken });
      toast.success("Background image uploaded");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Cover upload failed");
    }
  });

  const onAvatarDrop = useCallback(
    (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) uploadAvatarMutation.mutate(file);
    },
    [uploadAvatarMutation]
  );

  const onAvatarChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) uploadAvatarMutation.mutate(file);
      event.target.value = "";
    },
    [uploadAvatarMutation]
  );

  const onCoverChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) uploadCoverMutation.mutate(file);
      event.target.value = "";
    },
    [uploadCoverMutation]
  );

  const themeDef = useMemo(() => getProfileTheme(form.theme), [form.theme]);

 const onSave = async () => {
  try {
    let animationStyle = form.animationStyle;
    if (!isPro && animationStyle === "bounce") animationStyle = "none";

    const updated = await updateSettings.mutateAsync({
      name: form.name,
      bio: form.bio.slice(0, 140),
      profileImage: form.profileImage,
      socialLinks: form.socialLinks,
      theme: form.theme,
      customBgColor: form.customBgColor,
      customBgImage: isPro ? form.customBgImage : profile?.customBgImage,
      customFont: form.customFont,
      bodyFont: form.bodyFont,
      buttonStyle: form.buttonStyle,
      buttonColor: form.buttonColor,
      textColor: form.textColor,
      animationStyle
    });
    
    if (updated) {
      setAuth({ user: { ...user, ...updated }, accessToken: useAuthStore.getState().accessToken });
      
      // IMPORTANT: Clear public profile cache
      if (user?.username) {
        queryClient.invalidateQueries({ queryKey: ["public-profile", user.username] });
      }
      
      // Also clear any cached profile data
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
    }
    
    toast.success("Profile updated");
  } catch (error) {
    toast.error(error?.response?.data?.message || "Failed to save profile changes");
  }
};

  const previewMotion = (i) => {
    if (form.animationStyle === "bounce" && isPro) {
      return { animate: { y: [0, -4, 0] }, transition: { repeat: Infinity, duration: 2.2, delay: i * 0.12 } };
    }
    if (form.animationStyle === "slide") {
      return { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, transition: { delay: i * 0.06 } };
    }
    if (form.animationStyle === "fade") {
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: i * 0.06 } };
    }
    return {};
  };

  const pageBgStyle = useMemo(() => {
    const gradient = themeGradientCSS(themeDef);
    const wash = form.customBgColor
      ? `radial-gradient(ellipse 100% 60% at 50% 0%, ${form.customBgColor}33 0%, transparent 55%), `
      : "";
    return {
      backgroundImage: `${wash}${gradient}`,
      backgroundSize: "cover",
      backgroundColor: form.customBgColor || themeDef.from
    };
  }, [form.customBgColor, themeDef]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl md:text-4xl">Appearance</h1>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Left Column - Settings */}
        <div className="space-y-5">
          <GlassCard className="space-y-4">
            <h2 className="font-display text-2xl">Profile</h2>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-bg-elevated/40 px-4 py-8 text-center transition hover:border-accent-cyan/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onAvatarDrop}
            >
              <input accept="image/*" className="hidden" id="avatar-file" type="file" onChange={onAvatarChange} />
              <label className="flex cursor-pointer flex-col items-center gap-2" htmlFor="avatar-file">
                {form.profileImage ? (
                  <img
                    alt=""
                    className="h-20 w-20 rounded-full border border-white/20 object-cover"
                    src={form.profileImage}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-bg-elevated/60">
                    <Upload className="h-8 w-8 text-text-muted" />
                  </div>
                )}
                <span className="text-sm font-medium text-text-primary">Drop an image or click to upload</span>
                <span className="text-xs text-text-muted">Saved to Cloudinary • max ~8MB</span>
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-text-muted">Display name</span>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-sm text-text-muted">Bio</span>
              <textarea
                className="mt-2 min-h-[96px] w-full resize-y rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                maxLength={140}
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              />
              <span className="mt-1 block text-right text-xs text-text-muted">{form.bio.length}/140</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {(["instagram", "youtube", "twitter", "tiktok"]).map((key) => (
                <label className="block" key={key}>
                  <span className="mb-1 flex items-center gap-2 text-sm capitalize text-text-muted">
                    {socialIcon(key)}
                    {key}
                  </span>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                    placeholder={`https://${key}.com/...`}
                    value={form.socialLinks[key]}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, socialLinks: { ...p.socialLinks, [key]: e.target.value } }))
                    }
                  />
                </label>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <h2 className="font-display text-2xl">Themes</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {themePresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`rounded-xl border p-3 text-left transition ${
                    form.theme === preset.id ? "border-accent-cyan ring-1 ring-accent-cyan/40" : "border-white/10 hover:border-white/20"
                  }`}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      theme: preset.id,
                      buttonColor: getProfileTheme(preset.id).button
                    }))
                  }
                >
                  <div className="mb-2 h-14 rounded-lg" style={{ backgroundImage: preset.gradient }} />
                  <p className="text-sm font-medium">{preset.label}</p>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-bg-elevated/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-text-primary">Custom background color</p>
                {!isPro ? (
                  <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                    Pro
                  </span>
                ) : null}
              </div>
              {isPro ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                  <HexColorPicker color={form.customBgColor} onChange={(c) => setForm((p) => ({ ...p, customBgColor: c }))} />
                  <div className="text-xs text-text-muted">
                    <p>Overrides the theme wash. Fine-tune hex for dark or light looks.</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-muted">
                  Upgrade to Pro for the full hex color picker on top of your theme gradient.
                </p>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Background image</p>
                {!isPro ? (
                  <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                    Pro
                  </span>
                ) : null}
              </div>
              {isPro ? (
                <div className="mt-2">
                  <input accept="image/*" className="text-sm" type="file" onChange={onCoverChange} />
                  {form.customBgImage ? (
                    <p className="mt-1 truncate text-xs text-text-muted">{form.customBgImage}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-text-muted">Upgrade to Pro to upload a full-width background image.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <h2 className="font-display text-2xl">Typography & buttons</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-text-muted">Heading font</span>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                  value={form.customFont}
                  onChange={(e) => setForm((p) => ({ ...p, customFont: e.target.value }))}
                >
                  {headingFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-text-muted">Body font</span>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                  value={form.bodyFont}
                  onChange={(e) => setForm((p) => ({ ...p, bodyFont: e.target.value }))}
                >
                  {bodyFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm text-text-muted">Button style</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUTTON_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`rounded-xl border px-2 py-4 text-center text-xs font-semibold transition ${
                      form.buttonStyle === preset.id ? "border-accent-cyan bg-accent-cyan/15" : "border-white/10 bg-bg-elevated/50"
                    }`}
                    onClick={() => setForm((p) => ({ ...p, buttonStyle: preset.id }))}
                  >
                    <span
                      className={`mx-auto mb-2 flex w-[85%] items-center justify-center text-[11px] text-white ${previewButtonClass(preset.id)}`}
                      style={{ backgroundColor: form.buttonColor }}
                    >
                      Aa
                    </span>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-text-muted">Button color</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <HexColorPicker color={form.buttonColor} onChange={(c) => setForm((p) => ({ ...p, buttonColor: c }))} />
              </div>
            </div>

            {/* Text Color Picker - Fixed Working Version */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-text-muted mb-2">📝 Text Color</p>
              <div className="flex flex-col gap-3">
                <HexColorPicker color={form.textColor} onChange={(c) => setForm((p) => ({ ...p, textColor: c }))} />
                <div className="flex items-center gap-3 flex-wrap">
                  <div 
                    className="w-10 h-10 rounded-full border-2 border-white/20 shadow-lg transition-all duration-300" 
                    style={{ backgroundColor: form.textColor }} 
                  />
                  <div className="flex-1">
                    <p className="text-xs text-text-muted">Selected color: <span style={{ color: form.textColor, fontWeight: 'bold' }}>{form.textColor}</span></p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => setForm(p => ({ ...p, textColor: "#FFFFFF" }))}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 transition"
                      >
                        White
                      </button>
                      <button 
                        onClick={() => setForm(p => ({ ...p, textColor: "#000000" }))}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 transition"
                      >
                        Black
                      </button>
                      <button 
                        onClick={() => setForm(p => ({ ...p, textColor: "#6C63FF" }))}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 transition"
                      >
                        Purple
                      </button>
                      <button 
                        onClick={() => setForm(p => ({ ...p, textColor: "#00D4FF" }))}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 transition"
                      >
                        Cyan
                      </button>
                    </div>
                  </div>
                </div>
                {/* Live preview of text color */}
                <div className="mt-2 p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-text-muted mb-2">Live Preview:</p>
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: form.textColor }}>✓ This is how your heading will look</p>
                    <p className="text-xs" style={{ color: form.textColor + "CC" }}>✓ This is how your body text will look</p>
                    <p className="text-xs" style={{ color: form.textColor + "99" }}>✓ This is how muted text will look</p>
                  </div>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="text-sm text-text-muted">Link animations</span>
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                value={!isPro && form.animationStyle === "bounce" ? "none" : form.animationStyle}
                onChange={(e) => setForm((p) => ({ ...p, animationStyle: e.target.value }))}
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="bounce" disabled={!isPro}>
                  Bounce {!isPro ? "(Pro)" : ""}
                </option>
              </select>
            </label>

            <NeonButton onClick={onSave}>{updateSettings.isPending ? "Saving…" : "Save changes"}</NeonButton>
          </GlassCard>
        </div>

        {/* Right Column - Live Preview */}
        <GlassCard className="h-fit lg:sticky lg:top-6 overflow-hidden">
          <h2 className="mb-4 font-display text-2xl">Live preview</h2>
          <p className="mb-4 text-xs text-text-muted">Updates as you type — saving syncs to your public page.</p>
          
          {/* Phone Preview Container */}
          <div className="flex justify-center items-center">
            <div className="relative w-[300px]">
              <div className="relative rounded-[2rem] bg-[#1C1C2E] p-2 shadow-2xl">
                <div className="relative overflow-hidden rounded-[1.5rem] bg-black">
                  {/* Dynamic Island */}
                  <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black/90" />
                  
                  {/* Status Bar */}
                  <div className="absolute left-3 top-2 z-20 text-[10px] font-medium text-white/80">9:41</div>
                  <div className="absolute right-3 top-2 z-20 flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  </div>
                  
                  {/* Scrollable Content */}
                  <div 
                    className="h-[520px] overflow-y-auto"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${form.buttonColor} #2a2a3e`
                    }}
                  >
                    <div className="px-4 py-8" style={pageBgStyle}>
                      {/* Profile Section */}
                      <div className="text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                          {form.profileImage ? (
                            <img alt="Avatar" className="h-full w-full object-cover" src={form.profileImage} />
                          ) : (
                            <span className="text-3xl">👤</span>
                          )}
                        </div>
                        
                        {/* Name with text color */}
                        <h3 
                          className="mt-3 text-xl font-bold transition-colors duration-300" 
                          style={{ 
                            fontFamily: FONT_PREVIEW[form.customFont],
                            color: form.textColor
                          }}
                        >
                          {form.name || "username"}
                        </h3>
                        
                        {/* Bio with text color (slightly dimmed) */}
                        <p 
                          className="mt-1 text-sm transition-colors duration-300" 
                          style={{ 
                            fontFamily: FONT_PREVIEW[form.bodyFont],
                            color: form.textColor + "CC"
                          }}
                        >
                          {form.bio || "Your short bio shows here."}
                        </p>
                      </div>

                      {/* Social Links */}
                      <div className="mt-4 flex justify-center gap-3">
                        {(["instagram", "youtube", "twitter", "tiktok"]).map((k) =>
                          form.socialLinks[k] ? (
                            <div key={k} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:scale-105">
                              {socialIcon(k)}
                            </div>
                          ) : null
                        )}
                      </div>

                      {/* Links */}
                      <div className="mt-6 flex flex-col gap-3">
                        {(previewLinks.length ? previewLinks.slice(0, 5) : [
                          { _id: "p1", title: "Example link", icon: "🔗" },
                          { _id: "p2", title: "Another link", icon: "🔗" },
                        ]).map((link, index) => (
                          <motion.div key={link._id} {...previewMotion(index)}>
                            <div
                              className={`flex w-full items-center justify-between gap-3 border px-4 py-3 text-sm font-medium transition-all ${previewButtonClass(form.buttonStyle)}`}
                              style={{
                                backgroundColor: form.buttonColor,
                                color: contrastText(form.buttonColor),
                                borderColor: "rgba(255,255,255,0.1)"
                              }}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-black/10 text-sm">
                                {link.icon || "🔗"}
                              </span>
                              <span className="flex-1 truncate text-center text-sm" style={{ color: contrastText(form.buttonColor) }}>
                                {link.title}
                              </span>
                              <span className="text-xs opacity-50">→</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Join Button */}
                      <div className="mt-8">
                        <div
                          className="w-full border px-4 py-3 text-center text-sm font-semibold transition-all rounded-xl"
                          style={{
                            backgroundColor: form.buttonColor,
                            color: contrastText(form.buttonColor),
                            borderColor: "rgba(255,255,255,0.2)"
                          }}
                        >
                          Join {form.name || "username"} on LinkSphere ✨
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-6 flex justify-center gap-4">
                        <span className="text-[10px] text-white/30 cursor-pointer">Cookie Preferences</span>
                        <span className="text-[10px] text-white/30 cursor-pointer">Report</span>
                        <span className="text-[10px] text-white/30 cursor-pointer">Privacy</span>
                      </div>
                      <div className="mt-4" />
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex justify-center pb-1">
                  <div className="h-1 w-20 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-center text-xs text-text-muted">Live preview of your public profile</p>
          {user?.username ? (
            <Link className="mt-3 block text-center text-sm text-accent-cyan underline" to={`/@${user.username}`} target="_blank">
              Open public profile →
            </Link>
          ) : null}
        </GlassCard>
      </div>
    </div>
  );
}

export default ProfileEditorPage;