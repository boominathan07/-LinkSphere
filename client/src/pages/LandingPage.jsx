import { Link } from "react-router-dom";
import NeonButton from "../components/ui/NeonButton";

function LandingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
      <p className="mb-4 rounded-full bg-accent-cyan/10 px-3 py-1 text-xs text-accent-cyan sm:px-4">
        Digital Observatory
      </p>
      <h1 className="font-display text-3xl leading-tight sm:text-5xl md:text-7xl">
        Your Brand in
        <span className="bg-gradient-to-r from-accent-violet-soft to-accent-cyan bg-clip-text text-transparent"> One Unified Link</span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-text-muted sm:mt-6 sm:text-base">
        LinkSphere is the high-density command center for creators who want beautiful pages, true audience ownership, and deep click intelligence.
      </p>
      
      {/* Buttons - Fixed for mobile */}
      <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
        <Link to="/dashboard" className="w-full sm:w-auto">
          <NeonButton className="w-full sm:w-auto">Launch Dashboard</NeonButton>
        </Link>
        <Link 
          to="/login" 
          className="w-full rounded-full border border-white/15 px-5 py-2.5 text-sm text-text-primary transition hover:bg-white/5 sm:w-auto"
        >
          Login
        </Link>
        <Link 
          to="/register" 
          className="w-full rounded-full border border-accent-cyan/30 px-5 py-2.5 text-sm text-accent-cyan transition hover:bg-accent-cyan/10 sm:w-auto"
        >
          Register
        </Link>
      </div>
    </div>
  );
}

export default LandingPage;