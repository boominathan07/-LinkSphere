import { Link } from "react-router-dom";
import NeonButton from "../components/ui/NeonButton";

function LandingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 rounded-full bg-accent-cyan/10 px-4 py-1 text-xs text-accent-cyan">Digital Observatory</p>
      <h1 className="font-display text-5xl leading-tight md:text-7xl">
        Your Brand in
        <span className="bg-gradient-to-r from-accent-violet-soft to-accent-cyan bg-clip-text text-transparent"> One Unified Link</span>
      </h1>
      <p className="mt-6 max-w-2xl text-text-muted">
        LinkSphere is the high-density command center for creators who want beautiful pages, true audience ownership, and deep click intelligence.
      </p>
      <div className="mt-10 flex gap-4">
        <Link to="/dashboard">
          <NeonButton>Launch Dashboard</NeonButton>
        </Link>
        <Link to="/login" className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-text-primary">
          Login
        </Link>
        <Link to="/register" className="rounded-full border border-accent-cyan/30 px-5 py-2.5 text-sm text-accent-cyan">
          Register
        </Link>
      </div>
      
    </div>
  );
}

export default LandingPage;
