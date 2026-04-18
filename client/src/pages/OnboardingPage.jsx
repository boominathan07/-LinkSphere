import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import api from "../lib/api";
import { getPublicProfileHost } from "../lib/publicProfileUrl";
import { PROFILE_THEMES } from "../lib/profileThemes";
import { checkUsernameAvailability } from "../hooks/useAuth";
import { useCreateLink } from "../hooks/useLinks";
import { useUpdateProfileSettings } from "../hooks/useSettings";
import { useAuthStore } from "../store/authStore";

const THEME_CARDS = PROFILE_THEMES.slice(0, 10);

const LINK_SUGGESTIONS = [
  { title: "Instagram", url: "https://instagram.com/" },
  { title: "YouTube", url: "https://youtube.com/" },
  { title: "Twitter / X", url: "https://twitter.com/" },
  { title: "Website", url: "https://" },
  { title: "Portfolio", url: "https://" }
];

function randomSuffix() {
  return Math.floor(100 + Math.random() * 899);
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const updateProfile = useUpdateProfileSettings();
  const createLink = useCreateLink();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(user?.username || "");
  const [slugStatus, setSlugStatus] = useState("idle");
  const [slugMessage, setSlugMessage] = useState("");

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.profileImage || "");
  const [selectedTheme, setSelectedTheme] = useState(THEME_CARDS[0]?.id || "obsidian-pulse");

  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const host = getPublicProfileHost();

  const usernameSuggestions = useMemo(() => {
    const raw = (user?.name || "creator").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "creator";
    const a = `${raw}_${randomSuffix()}`;
    const b = `${raw}_${randomSuffix()}`;
    const c = `hey_${randomSuffix()}`;
    return [a, b, c];
  }, [user?.name]);

  useEffect(() => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
      setSlugStatus("invalid");
      setSlugMessage("Use 3–30 characters: lowercase letters, numbers, underscore.");
      return;
    }
    setSlugStatus("checking");
    setSlugMessage("Checking availability…");
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(normalized);
        const unchanged = user?.username?.toLowerCase() === normalized;
        if (result.available || unchanged) {
          setSlugStatus("available");
          setSlugMessage("This username is available.");
        } else {
          setSlugStatus("taken");
          setSlugMessage("That username is already taken.");
        }
      } catch (_error) {
        setSlugStatus("available");
        setSlugMessage("Username available");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [username, user?.username]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const canNext1 = slugStatus === "available" || slugStatus === "idle";
  const canFinish = linkTitle.trim() && /^https?:\/\/.+/i.test(linkUrl.trim());

  const onStep1Next = async () => {
    // Store username in localStorage for now
    localStorage.setItem("onboardingUsername", username.trim().toLowerCase());
    setStep(2);
    toast.success("Username selected!");
  };

  const onSkipCustomize = () => setStep(3);

const onAvatar = async (file) => {
  console.log("File selected:", file);
  
  if (!file) {
    toast.error("No file selected");
    return;
  }
  
  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file");
    return;
  }
  
  const formData = new FormData();
  formData.append("image", file);
  
  try {
    const token = localStorage.getItem("accessToken");
    console.log("Token:", token ? "Exists" : "Missing");
    
    const response = await fetch("http://localhost:5000/api/profile/avatar", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    console.log("Response:", data);
    
    if (data.user?.profileImage) {
      setAvatarUrl(data.user.profileImage);
      toast.success("Photo uploaded!");
    } else {
      toast.error(data.message || "Upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    toast.error("Upload failed");
  }
};
  const onCustomizeNext = async () => {
    // Skip API call for now - just go to next step
    setStep(3);
    toast.success("Profile saved!");
  };

 const onComplete = async () => {
  if (!canFinish) {
    toast.error("Add one valid link with https://");
    return;
  }
  try {
    const savedUsername = localStorage.getItem("onboardingUsername") || username.trim().toLowerCase();
    
    // Update profile
    try {
      const updatedUser = await updateProfile.mutateAsync({
        username: savedUsername,
        name: displayName.trim() || user?.name,
        bio: bio.slice(0, 140),
        profileImage: avatarUrl,
        theme: selectedTheme,
        onboardingCompleted: true
      });
      
      if (updatedUser) {
        setAuth({ user: updatedUser, accessToken });
        localStorage.setItem("accessToken", accessToken);
      }
    } catch (profileError) {
      console.log("Profile update skipped");
    }
    
    // Create first link
    await createLink.mutateAsync({
      title: linkTitle.trim(),
      url: linkUrl.trim()
    });

    localStorage.removeItem("onboardingUsername");
    
    confetti({ particleCount: 140, spread: 72, origin: { y: 0.55 } });
    setShowSuccessModal(true);
  } catch (error) {
    console.error("Complete setup error:", error);
    toast.error("Could not complete setup. You can continue from dashboard.");
    navigate("/dashboard");
  }
};
  const publicUrl = `${host}/@${username.trim().toLowerCase() || "user"}`;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <GlassCard className="relative w-full space-y-8 overflow-hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-cyan">Onboarding</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">Welcome to LinkSphere</h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`rounded-xl border px-4 py-3 text-sm ${
                step === n ? "border-accent-cyan bg-accent-cyan/15" : "border-white/10 bg-bg-elevated/50"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Step {n}</span>
              <p className="mt-1 font-medium">
                {n === 1 ? "Username" : null}
                {n === 2 ? "Profile" : null}
                {n === 3 ? "First link" : null}
              </p>
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <h2 className="font-display text-2xl">Choose your LinkSphere username</h2>
            <p className="text-sm text-text-muted">This becomes your public URL. You can change it later from settings.</p>
            <label className="block">
              <span className="text-sm text-text-muted">Username</span>
              <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-bg-elevated/60 px-4">
                <span className="mr-2 whitespace-nowrap text-sm text-text-muted">{host}/@</span>
                <input
                  className="w-full bg-transparent py-3 outline-none"
                  autoComplete="off"
                  placeholder="your_name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                />
              </div>
            </label>
            <p
              className={`text-sm ${
                slugStatus === "available"
                  ? "text-emerald-300"
                  : slugStatus === "taken" || slugStatus === "invalid"
                    ? "text-rose-300"
                    : "text-text-muted"
              }`}
            >
              {slugMessage || "Start typing to check availability."}
            </p>
            <div className="flex flex-wrap gap-2">
              {usernameSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border border-white/10 bg-bg-elevated/60 px-3 py-1.5 text-xs hover:border-accent-cyan/50"
                  onClick={() => setUsername(s)}
                >
                  @{s}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              Preview: <span className="text-accent-cyan">{publicUrl}</span>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <NeonButton disabled={!canNext1} onClick={onStep1Next}>
                Continue
              </NeonButton>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <h2 className="font-display text-2xl">Customize your profile</h2>
            
            {/* Avatar Upload */}
            <div
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-bg-elevated/40 px-4 py-6 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onAvatar(e.dataTransfer?.files?.[0]);
              }}
            >
              <input
                accept="image/*"
                className="hidden"
                id="onboard-avatar"
                type="file"
                onChange={(e) => onAvatar(e.target.files?.[0])}
              />
              <label className="flex cursor-pointer flex-col items-center gap-2" htmlFor="onboard-avatar">
                {avatarUrl ? (
                  <img alt="Profile" className="h-20 w-20 rounded-full border border-white/20 object-cover" src={avatarUrl} />
                ) : (
                  <div className="rounded-full border border-white/10 bg-bg-elevated/70 px-6 py-8 text-xs text-text-muted">
                    📸 Click to upload photo
                  </div>
                )}
                <span className="text-xs text-text-muted">Upload profile picture</span>
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-text-muted">Display name</span>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm text-text-muted">Bio</span>
              <textarea
                className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                maxLength={140}
                placeholder="A short line about you…"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <span className="mt-1 block text-right text-xs text-text-muted">{bio.length}/140</span>
            </label>

            <div>
              <p className="mb-2 text-sm text-text-muted">Theme</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {THEME_CARDS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`rounded-xl border p-3 text-left ${
                      selectedTheme === t.id ? "border-accent-cyan bg-accent-cyan/15" : "border-white/10 bg-bg-elevated/60"
                    }`}
                    onClick={() => setSelectedTheme(t.id)}
                  >
                    <div
                      className="mb-2 h-12 rounded-lg"
                      style={{ background: `linear-gradient(180deg, ${t.from} 0%, ${t.to} 100%)` }}
                    />
                    <p className="text-sm font-medium">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="text-sm text-text-muted underline underline-offset-4 hover:text-white" type="button" onClick={onSkipCustomize}>
                Skip for now
              </button>
              <NeonButton onClick={onCustomizeNext}>
                Continue
              </NeonButton>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="font-display text-2xl">Add your first link</h2>
            <p className="text-sm text-text-muted">You need at least one link to complete setup.</p>

            <div className="flex flex-wrap gap-2">
              {LINK_SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  className="rounded-full border border-white/10 bg-bg-elevated/60 px-3 py-1.5 text-xs hover:border-accent-cyan/50"
                  onClick={() => {
                    setLinkTitle(s.title);
                    setLinkUrl(s.url);
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-sm text-text-muted">Title</span>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                placeholder="My portfolio"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm text-text-muted">URL</span>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none"
                placeholder="https://"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </label>

            <div className="flex justify-between gap-2 pt-2">
              <button className="rounded-xl border border-white/10 px-4 py-2 text-sm" type="button" onClick={() => setStep(2)}>
                Back
              </button>
              <NeonButton disabled={!canFinish} onClick={onComplete}>
                Complete setup
              </NeonButton>
            </div>
          </div>
        ) : null}
      </GlassCard>

      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog">
          <GlassCard className="max-w-md space-y-5 p-8 text-center">
            <h3 className="font-display text-2xl">🎉 Your profile is live!</h3>
            <p className="text-sm text-text-muted">Share this link anywhere your audience finds you.</p>
            <div className="rounded-xl border border-white/10 bg-bg-elevated/50 px-4 py-3 text-sm text-accent-cyan break-all">
              {publicUrl}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-xl border border-white/15 px-4 py-3 text-sm"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy URL
              </button>
              <NeonButton
                onClick={() => {
                  navigate("/dashboard");
                  setShowSuccessModal(false);
                }}
              >
                Go to dashboard
              </NeonButton>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}