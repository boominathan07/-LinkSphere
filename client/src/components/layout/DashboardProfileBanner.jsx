import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ExternalLink, Link2, QrCode } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getPublicProfileHost, getPublicProfilePageUrl } from "../../lib/publicProfileUrl";
import ProfileQrModal from "../ui/ProfileQrModal";

export default function DashboardProfileBanner() {
  const user = useAuthStore((s) => s.user);
  const [qrOpen, setQrOpen] = useState(false);

  const { displayLine, copyUrl, openUrl, qrValue, isPro } = useMemo(() => {
    const host = getPublicProfileHost();
    const uname = user?.username;
    if (!uname) {
      return { displayLine: "", copyUrl: "", openUrl: "", qrValue: "", isPro: false };
    }
    const pathUrl = getPublicProfilePageUrl(uname);
    const display = `${host}/@${uname}`;
    const plan = String(user?.plan || "free").toLowerCase();
    const pro = plan === "pro" || plan === "business";
    return {
      displayLine: display,
      copyUrl: pathUrl,
      openUrl: pathUrl,
      qrValue: pathUrl,
      isPro: pro
    };
  }, [user?.username, user?.plan]);

  if (!user?.username) {
    return null;
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyUrl);
      toast.success("Copied!");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface/80 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="min-w-0 text-sm text-text-primary">
          <span className="mr-1.5 inline-block" aria-hidden>
            🔗
          </span>
          <span className="text-text-muted">Your profile: </span>
          <span className="font-medium text-white">{displayLine}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/10"
          >
            <Link2 className="h-3.5 w-3.5 opacity-80" />
            Copy
          </button>
          <button
            type="button"
            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            Open
          </button>
          {isPro ? (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-xs font-medium text-accent-cyan transition hover:bg-accent-cyan/20"
            >
              <QrCode className="h-3.5 w-3.5" />
              Share QR
            </button>
          ) : null}
        </div>
      </div>

      <ProfileQrModal open={qrOpen} onClose={() => setQrOpen(false)} profileUrl={qrValue} username={user.username} />
    </>
  );
}
