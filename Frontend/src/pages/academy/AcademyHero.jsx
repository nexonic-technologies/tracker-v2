import { motion as Motion } from 'framer-motion';
import { Terminal, Shield, Cpu, ChevronDown } from 'lucide-react';

export default function AcademyHero() {
  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center text-center p-6 overflow-hidden bg-slate-950/40 border border-slate-900 rounded-[30px] shadow-2xl">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/2 to-transparent pointer-events-none" />
      
      <Motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-6">
          <Terminal size={14} className="animate-pulse" />
          Work Hub Core Architecture
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight bg-clip-text bg-gradient-to-b from-white to-slate-400">
          Populate Engine <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Academy</span>
        </h1>

        <p className="mt-6 text-sm md:text-base text-slate-400 leading-relaxed max-w-xl mx-auto">
          Welcome to the scroll-driven interactive storyboard of the Populate Engine. 
          Scroll down to travel through the 10 stages of the request lifecycle, explore policy logic, queries, and diagnostics.
        </p>

        {/* Feature Icons Grid */}
        <div className="grid grid-cols-3 gap-4 my-10 max-w-md mx-auto">
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-900">
            <Cpu className="text-indigo-400 mb-2" size={20} />
            <span className="text-[11px] font-semibold text-slate-350">10-Step Pipeline</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-900">
            <Shield className="text-emerald-400 mb-2" size={20} />
            <span className="text-[11px] font-semibold text-slate-350">RBAC / FBAC Policies</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-900">
            <Terminal className="text-cyan-400 mb-2" size={20} />
            <span className="text-[11px] font-semibold text-slate-350">Live Diagnostics</span>
          </div>
        </div>

        {/* Bouncing Scroll Down Indicator */}
        <Motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 10 }}
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.2, ease: "easeInOut" }}
          className="flex flex-col items-center justify-center gap-1 mt-6 text-slate-500"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest">Scroll to start</span>
          <ChevronDown size={18} />
        </Motion.div>
      </Motion.div>
    </div>
  );
}
