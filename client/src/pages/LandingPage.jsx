const TickerBar = () => {
  const items = [
    "LinkSphere v2.0 now live",
    "Analytics dashboard redesigned",
    "Custom domains now free for all plans",
    "48K+ creators onboarded",
  ];
  const doubled = [...items, ...items];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-10 overflow-hidden flex items-center"
      style={{ background: "rgba(124,58,237,0.9)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="flex gap-20 whitespace-nowrap"
        style={{ animation: "marquee 28s linear infinite" }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-[11px] font-medium uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {item}
            <span
              className="inline-block w-1 h-1 rounded-full mx-3 align-middle"
              style={{ background: "rgba(255,255,255,0.5)" }}
            />
          </span>
        ))}
      </div>
    </div>
  );
};

const GridBg = () => (
  <div
    className="fixed inset-0 pointer-events-none"
    style={{
      backgroundImage: `
        linear-gradient(rgba(20,184,166,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(20,184,166,0.035) 1px, transparent 1px)
      `,
      backgroundSize: "72px 72px",
    }}
  />
);

const GlowTL = () => (
  <div
    className="fixed pointer-events-none rounded-full"
    style={{
      top: -120, left: -80, width: 700, height: 700,
      background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
    }}
  />
);

const GlowBR = () => (
  <div
    className="fixed pointer-events-none rounded-full"
    style={{
      bottom: -180, right: -100, width: 600, height: 600,
      background: "radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 70%)",
    }}
  />
);

const Badge = () => (
  <div
    className="inline-flex items-center gap-2 mb-8 px-[18px] py-[7px] rounded-full border"
    style={{
      borderColor: "rgba(20,184,166,0.25)",
      background: "rgba(20,184,166,0.05)",
      color: "#2dd4bf",
      animation: "fadeUp 0.6s ease both",
    }}
  >
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: "#2dd4bf", animation: "pulse 2s ease infinite" }}
    />
    <span className="text-[10px] font-medium tracking-[0.15em] uppercase">
      Digital Observatory
    </span>
  </div>
);

export default function LinkSphereLanding() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(45,212,191,0.4); }
          50%      { box-shadow: 0 0 0 6px rgba(45,212,191,0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        .ls-headline { font-family: 'Syne', sans-serif; }
        .ls-body      { font-family: 'DM Sans', sans-serif; }

        .btn-primary { transition: all 0.3s ease; }
        .btn-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 40px rgba(124,58,237,0.55) !important;
        }
        .btn-ghost { transition: all 0.3s ease; }
        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.2) !important;
          background: rgba(255,255,255,0.08) !important;
          color: #f1f5f9 !important;
          transform: translateY(-2px);
        }
        .btn-teal { transition: all 0.3s ease; }
        .btn-teal:hover {
          background: rgba(20,184,166,0.65) !important;
          color: #fff !important;
          border-color: #2dd4bf !important;
          box-shadow: 0 0 28px rgba(45,212,191,0.35);
          transform: translateY(-2px);
        }
      `}</style>

      <div
        className="ls-body relative w-full min-h-screen overflow-x-hidden"
        style={{ background: "#030712" }}
      >
        <GridBg />
        <GlowTL />
        <GlowBR />
        <TickerBar />

        {/* ── HERO ── */}
        <section
          className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center text-center px-5 sm:px-10 pb-16"
          style={{ paddingTop: 120 }}
        >
          <Badge />

          {/* Heading — clamp(2.4rem→7rem) keeps it readable & no overflow on mobile */}
          <h1
            className="ls-headline font-extrabold leading-[1.05] tracking-[-0.03em] mb-6 w-full"
            style={{
              fontSize: "clamp(2.4rem, 7vw, 7rem)",
              color: "#f1f5f9",
              animation: "fadeUp 0.7s 0.1s ease both",
            }}
          >
            Your Brand in{" "}
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              One Unified Link
            </span>
          </h1>

          {/* Subtext — #94a3b8 instead of #64748b so it pops next to bright heading */}
          <p
            className="font-light leading-[1.75] mb-11 max-w-[600px] w-full"
            style={{
              fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
              color: "#94a3b8",
              animation: "fadeUp 0.7s 0.2s ease both",
            }}
          >
            LinkSphere is the high-density command center for creators who want
            beautiful pages, true audience ownership, and deep click intelligence.
          </p>

          {/* ── BUTTONS ── */}
          <div
            className="flex flex-wrap gap-3 items-center justify-center w-full"
            style={{ animation: "fadeUp 0.7s 0.3s ease both" }}
          >
            <a
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white text-sm font-semibold no-underline cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                border: "1px solid rgba(124,58,237,0.4)",
                boxShadow: "0 6px 28px rgba(109,40,217,0.4)",
              }}
            >
              Launch Dashboard <span>→</span>
            </a>

            {/* vertical divider — hidden on mobile so buttons wrap cleanly */}
            <div
              className="hidden sm:block w-px h-5 flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            <a
              href="/login"
              className="btn-ghost inline-flex items-center px-7 py-3.5 rounded-full text-sm font-normal no-underline cursor-pointer"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#94a3b8",
                backdropFilter: "blur(8px)",
              }}
            >
              Login
            </a>

            <a
              href="/register"
              className="btn-teal inline-flex items-center px-7 py-3.5 rounded-full text-sm font-medium no-underline cursor-pointer"
              style={{
                border: "1px solid rgba(20,184,166,0.3)",
                background: "rgba(20,184,166,0.06)",
                color: "#2dd4bf",
              }}
            >
              Register
            </a>
          </div>
        </section>
      </div>
    </>
  );
}