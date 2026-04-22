import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

function LandingPage() {
  const orbRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!orbRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 24;
      const y = (e.clientY / window.innerHeight - 0.5) * 24;
      orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#04050f] flex items-center justify-center overflow-hidden px-6">

      {/* ── Grid background ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Parallax orbs ── */}
      <div
        ref={orbRef}
        className="fixed inset-0 pointer-events-none z-0 transition-transform duration-150 ease-out"
      >
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[80px]" />
        <div className="absolute -bottom-60 -right-10 w-[500px] h-[500px] rounded-full bg-cyan-400/10 blur-[80px]" />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/5 text-cyan-400 text-[0.65rem] font-medium tracking-[0.12em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          Digital Observatory
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.4rem,7vw,5rem)] font-extrabold leading-[1.06] tracking-tight text-slate-100 mb-6">
          Your Brand in
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            One Unified Link
          </span>
        </h1>

        {/* Subtext */}
        <p className="max-w-xl text-[clamp(0.875rem,2vw,1rem)] font-light leading-relaxed text-slate-400 mb-10">
          LinkSphere is the high-density command center for creators who want beautiful pages, true audience ownership, and deep click intelligence.
        </p>

        {/* ── Buttons — same routes ── */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">

          {/* Launch Dashboard */}
          <Link to="/dashboard">
            <button className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-violet-600 to-violet-700 border border-violet-500/30 text-white text-sm font-semibold shadow-[0_4px_24px_rgba(109,40,217,0.45)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-300 whitespace-nowrap">
              Launch Dashboard
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </Link>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-white/10" />

          {/* Login */}
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/10 bg-white/[0.04] text-slate-400 text-sm font-medium backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 hover:text-white hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
          >
            Login
          </Link>

          {/* Register */}
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-cyan-500/35 bg-cyan-500/[0.06] text-cyan-400 text-sm font-medium backdrop-blur-sm hover:bg-cyan-500/70 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_24px_rgba(34,211,238,0.4)] hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
          >
            Register
          </Link>

        </div>

        {/* ── Stats strip ── */}
        <div className="flex items-center gap-8 mt-14 pt-8 border-t border-white/[0.06]">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100 tracking-tight">48K+</div>
            <div className="text-[0.65rem] uppercase tracking-widest text-slate-500 mt-0.5">Creators</div>
          </div>
          <div className="w-px h-9 bg-white/[0.07]" />
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100 tracking-tight">2.4M</div>
            <div className="text-[0.65rem] uppercase tracking-widest text-slate-500 mt-0.5">Clicks Tracked</div>
          </div>
          <div className="w-px h-9 bg-white/[0.07]" />
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100 tracking-tight">99.9%</div>
            <div className="text-[0.65rem] uppercase tracking-widest text-slate-500 mt-0.5">Uptime</div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default LandingPage;