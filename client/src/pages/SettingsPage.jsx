import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import { useAuthStore } from "../store/authStore";
import { Laptop, MapPin, Smartphone } from "lucide-react";
import {
  use2FADisable,
  use2FASetup,
  use2FAVerify,
  useChangePassword,
  useDeleteAccount,
  useNotificationPreferences,
  useProfileSettings,
  useRevokeSession,
  useSessions,
  useUpdateNotificationPreferences,
  useUpdateProfileSettings
} from "../hooks/useSettings";

const tabs = ["profile", "password", "2fa", "sessions", "notifications", "danger"];

function SettingsPage() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { data: profile } = useProfileSettings();
  const updateProfile = useUpdateProfileSettings();
  const changePassword = useChangePassword();
  const setup2FA = use2FASetup();
  const verify2FA = use2FAVerify();
  const disable2FA = use2FADisable();
  const { data: sessions = [] } = useSessions();
  const revokeSession = useRevokeSession();
  const { data: notificationPrefs } = useNotificationPreferences();
  const updateNotifications = useUpdateNotificationPreferences();
  const deleteAccount = useDeleteAccount();

  const [activeTab, setActiveTab] = useState("profile");
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    profileImage: "",
    bio: "",
    socialLinks: { instagram: "", youtube: "", twitter: "", tiktok: "" }
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFASetupData, setTwoFASetupData] = useState(null);
  const [notificationsForm, setNotificationsForm] = useState({
    weeklyReport: true,
    newSubscriberAlerts: true,
    emailVerifyReminder: true
  });
  const [dangerConfirm, setDangerConfirm] = useState("");

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      name: profile.name || "",
      email: profile.email || "",
      profileImage: profile.profileImage || "",
      bio: profile.bio || "",
      socialLinks: {
        instagram: profile.socialLinks?.instagram || "",
        youtube: profile.socialLinks?.youtube || "",
        twitter: profile.socialLinks?.twitter || "",
        tiktok: profile.socialLinks?.tiktok || ""
      }
    });
  }, [profile]);

  useEffect(() => {
    if (!notificationPrefs) return;
    setNotificationsForm({
      weeklyReport: Boolean(notificationPrefs.weeklyReport),
      newSubscriberAlerts: Boolean(notificationPrefs.newSubscriberAlerts),
      emailVerifyReminder: notificationPrefs.emailVerifyReminder !== false
    });
  }, [notificationPrefs]);

  const isDangerEnabled = useMemo(() => {
    return dangerConfirm.trim() === (profile?.username || "");
  }, [dangerConfirm, profile?.username]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        Settings
      </h1>
      
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl border px-4 py-2 text-sm capitalize transition-all ${
              activeTab === tab 
                ? "border-accent-cyan bg-accent-cyan/20 text-white shadow-lg shadow-accent-cyan/10" 
                : "border-white/10 text-text-muted hover:border-white/20 hover:bg-white/5"
            }`}
          >
            {tab === "2fa" ? "2FA" : tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" ? (
        <GlassCard className="space-y-4 p-6">
          <h2 className="font-display text-2xl">Profile Information</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-text-muted">Name</span>
              <input 
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
                value={profileForm.name} 
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} 
              />
            </label>
            <label className="block">
              <span className="text-sm text-text-muted">Email</span>
              <input 
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/40 px-4 py-3 text-text-muted outline-none cursor-not-allowed" 
                value={profileForm.email} 
                disabled 
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-text-muted">Avatar URL</span>
            <input 
              className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
              value={profileForm.profileImage} 
              onChange={(event) => setProfileForm((prev) => ({ ...prev, profileImage: event.target.value }))} 
            />
          </label>
          <label className="block">
            <span className="text-sm text-text-muted">Bio</span>
            <textarea 
              className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
              rows={3} 
              value={profileForm.bio} 
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))} 
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {["instagram", "youtube", "twitter", "tiktok"].map((platform) => (
              <label className="block" key={platform}>
                <span className="text-sm capitalize text-text-muted">{platform}</span>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all"
                  value={profileForm.socialLinks[platform]}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, [platform]: event.target.value }
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <NeonButton
            onClick={async () => {
              try {
                await updateProfile.mutateAsync(profileForm);
                toast.success("Profile updated successfully");
              } catch (error) {
                toast.error(error?.response?.data?.message || "Update failed");
              }
            }}
          >
            Save Profile
          </NeonButton>
        </GlassCard>
      ) : null}

      {/* Password Tab */}
      {activeTab === "password" ? (
        <GlassCard className="space-y-4 p-6">
          <h2 className="font-display text-2xl">Change Password</h2>
          <input 
            className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
            type="password" 
            placeholder="Current password" 
            value={passwordForm.currentPassword} 
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} 
          />
          <input 
            className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
            type="password" 
            placeholder="New password" 
            value={passwordForm.newPassword} 
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} 
          />
          <input 
            className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
            type="password" 
            placeholder="Confirm new password" 
            value={passwordForm.confirmPassword} 
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} 
          />
          <NeonButton
            onClick={async () => {
              if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                toast.error("New password and confirm password do not match");
                return;
              }
              if (passwordForm.newPassword.length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
              }
              try {
                await changePassword.mutateAsync({
                  currentPassword: passwordForm.currentPassword,
                  newPassword: passwordForm.newPassword
                });
                toast.success("Password updated successfully");
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              } catch (error) {
                toast.error(error?.response?.data?.message || "Password update failed");
              }
            }}
          >
            Update Password
          </NeonButton>
        </GlassCard>
      ) : null}

      {/* 2FA Tab */}
      {activeTab === "2fa" ? (
        <GlassCard className="space-y-4 p-6">
          <h2 className="font-display text-2xl">Two-Factor Authentication</h2>
          {profile?.plan === "free" ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
              <p className="text-sm text-amber-300">🔒 2FA is a Pro feature. Upgrade to enable it.</p>
            </div>
          ) : null}
          
          {profile?.is2FAEnabled ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
              <p className="text-sm text-emerald-300">✅ 2FA is currently enabled on your account.</p>
            </div>
          ) : null}
          
          {twoFASetupData && !profile?.is2FAEnabled ? (
            <div className="rounded-xl border border-white/10 bg-bg-elevated/50 p-4 text-center">
              <p className="text-sm text-text-muted mb-3">Scan this QR code in Google Authenticator</p>
              <div className="inline-block rounded-xl bg-white p-3">
                <QRCodeSVG value={twoFASetupData.otpauthUrl} size={180} />
              </div>
              <p className="text-xs text-text-muted mt-3">Or enter secret manually: <code className="text-accent-cyan">{twoFASetupData.secret}</code></p>
            </div>
          ) : null}
          
          <div className="flex flex-wrap gap-2">
            {!profile?.is2FAEnabled ? (
              <NeonButton
                onClick={async () => {
                  try {
                    const data = await setup2FA.mutateAsync();
                    setTwoFASetupData(data);
                    toast.success("2FA setup generated. Scan the QR code.");
                  } catch (error) {
                    toast.error(error?.response?.data?.message || "Unable to start 2FA setup");
                  }
                }}
              >
                Generate 2FA QR Code
              </NeonButton>
            ) : (
              <NeonButton
                onClick={async () => {
                  try {
                    await disable2FA.mutateAsync();
                    setTwoFASetupData(null);
                    toast.success("2FA disabled successfully");
                  } catch (error) {
                    toast.error(error?.response?.data?.message || "Unable to disable 2FA");
                  }
                }}
              >
                Disable 2FA
              </NeonButton>
            )}
          </div>
          
          {!profile?.is2FAEnabled && twoFASetupData ? (
            <div className="flex gap-2 mt-2">
              <input 
                className="flex-1 rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan/50 transition-all" 
                placeholder="Enter 6-digit code from authenticator" 
                value={twoFACode} 
                onChange={(event) => setTwoFACode(event.target.value)} 
              />
              <button
                className="rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan px-6 py-3 text-white font-medium hover:shadow-lg transition-all"
                type="button"
                onClick={async () => {
                  if (!twoFACode || twoFACode.length !== 6) {
                    toast.error("Please enter a valid 6-digit code");
                    return;
                  }
                  try {
                    await verify2FA.mutateAsync(twoFACode);
                    setTwoFACode("");
                    setTwoFASetupData(null);
                    toast.success("2FA enabled successfully");
                  } catch (error) {
                    toast.error(error?.response?.data?.message || "Invalid 2FA code");
                  }
                }}
              >
                Verify & Enable
              </button>
            </div>
          ) : null}
        </GlassCard>
      ) : null}

      {/* Sessions Tab */}
      {activeTab === "sessions" ? (
        <GlassCard className="space-y-3 p-6">
          <h2 className="font-display text-2xl">Active Sessions</h2>
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const dev = String(session.device || "").toLowerCase();
              const DeviceIcon = dev.includes("mobile") || dev.includes("iphone") || dev.includes("android") ? Smartphone : Laptop;
              return (
                <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-bg-elevated/50 p-4 hover:border-white/20 transition-all">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-lg border border-white/10 bg-bg-elevated/60 p-2 text-text-muted">
                      <DeviceIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{session.device || "Unknown Device"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-text-muted">
                        <MapPin className="inline h-3.5 w-3.5 opacity-70" aria-hidden />
                        <span>{session.location || "Unknown Location"}</span>
                        <span aria-hidden>•</span>
                        <span>Last seen {new Date(session.lastSeenAt || session.createdAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/40 px-4 py-1.5 text-xs text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    disabled={session.active}
                    onClick={async () => {
                      try {
                        await revokeSession.mutateAsync(session.id);
                        toast.success("Session revoked");
                      } catch (error) {
                        toast.error(error?.response?.data?.message || "Failed to revoke session");
                      }
                    }}
                  >
                    {session.active ? "Current Session" : "Revoke"}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No active sessions found.</p>
          )}
        </GlassCard>
      ) : null}

      {/* Notifications Tab */}
      {activeTab === "notifications" ? (
        <GlassCard className="space-y-4 p-6">
          <h2 className="font-display text-2xl">Notification Preferences</h2>
          <label className="flex items-center justify-between rounded-xl border border-white/10 p-4 hover:bg-white/5 transition-all cursor-pointer">
            <span>📊 Weekly analytics report</span>
            <input 
              type="checkbox" 
              checked={notificationsForm.weeklyReport} 
              onChange={(event) => setNotificationsForm((prev) => ({ ...prev, weeklyReport: event.target.checked }))}
              className="w-4 h-4 accent-accent-cyan"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-white/10 p-4 hover:bg-white/5 transition-all cursor-pointer">
            <span>📧 New subscriber alerts</span>
            <input 
              type="checkbox" 
              checked={notificationsForm.newSubscriberAlerts} 
              onChange={(event) => setNotificationsForm((prev) => ({ ...prev, newSubscriberAlerts: event.target.checked }))}
              className="w-4 h-4 accent-accent-cyan"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-white/10 p-4 hover:bg-white/5 transition-all cursor-pointer">
            <span>✉️ Email verification reminders</span>
            <input
              type="checkbox"
              checked={notificationsForm.emailVerifyReminder}
              onChange={(event) => setNotificationsForm((prev) => ({ ...prev, emailVerifyReminder: event.target.checked }))}
              className="w-4 h-4 accent-accent-cyan"
            />
          </label>
          <NeonButton
            onClick={async () => {
              try {
                await updateNotifications.mutateAsync(notificationsForm);
                toast.success("Notification preferences updated");
              } catch (error) {
                toast.error(error?.response?.data?.message || "Failed to update notifications");
              }
            }}
          >
            Save Preferences
          </NeonButton>
        </GlassCard>
      ) : null}

      {/* Danger Tab */}
      {activeTab === "danger" ? (
        <GlassCard className="space-y-4 p-6 border border-red-400/30 bg-red-500/5">
          <h2 className="font-display text-2xl text-red-400">⚠️ Danger Zone</h2>
          <p className="text-sm text-text-muted">
            This action is irreversible. Deleting your account will permanently remove all your data including links, clicks, subscribers, and subscription history.
          </p>
          <label className="block">
            <span className="text-sm text-text-muted">
              Type <span className="text-red-400 font-mono">{profile?.username}</span> to confirm
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 outline-none focus:border-red-400/50 transition-all text-red-300 placeholder:text-red-300/30"
              placeholder="Enter your username to confirm"
              value={dangerConfirm}
              onChange={(event) => setDangerConfirm(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!isDangerEnabled}
            className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              if (window.confirm("Are you absolutely sure? This action cannot be undone!")) {
                try {
                  await deleteAccount.mutateAsync(dangerConfirm);
                  clearAuth();
                  localStorage.removeItem("linksphere_session_id");
                  toast.success("Account deleted successfully");
                  window.location.href = "/";
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Delete account failed");
                }
              }
            }}
          >
            Permanently Delete Account
          </button>
        </GlassCard>
      ) : null}
    </div>
  );
}

export default SettingsPage;