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
    <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-full overflow-x-hidden px-4 sm:px-0">
  {/* Dashboard Button */}
  <Link to="/dashboard" className="w-full sm:w-auto">
    <button className="w-full rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-4 sm:px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 whitespace-nowrap">
      Launch Dashboard
    </button>
  </Link>
  
  {/* Login Button */}
  <Link 
    to="/login" 
    className="w-full sm:w-auto rounded-full border border-gray-500 bg-transparent px-4 sm:px-6 py-2.5 text-sm font-semibold text-gray-300 text-center hover:bg-gray-800 hover:border-gray-400 transition-all duration-300"
  >
    Login
  </Link>
  
  {/* Register Button */}
  <Link 
    to="/register" 
    className="w-full sm:w-auto rounded-full border border-cyan-500 bg-cyan-500/10 px-4 sm:px-6 py-2.5 text-sm font-semibold text-cyan-400 text-center hover:bg-cyan-500 hover:text-white transition-all duration-300"
  >
    Register
  </Link>
</div>
      
    </div>
  );
}

export default LandingPage;
