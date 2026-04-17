import { Link } from "react-router-dom";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <GlassCard className="max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">404</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Link Not Found</h1>
        <div className="mx-auto mt-6 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-bg-elevated/60 text-6xl">
          🔎
        </div>
        <p className="mt-5 text-text-muted">
          The page or link you are trying to open does not exist or was moved.
        </p>
        <div className="mt-6">
          <Link to="/">
            <NeonButton>Go to LinkSphere</NeonButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

export default NotFoundPage;
