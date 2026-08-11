import { motion as Motion, useScroll, useSpring } from 'framer-motion';
import { Code2 } from 'lucide-react';

import AcademyHero from './AcademyHero';
import RequestJourney from './RequestJourney';
import SecurityLayer from './SecurityLayer';
import CrudEngine from './CrudEngine';
import FeatureBuilder from './FeatureBuilder';
import DebuggingJourney from './DebuggingJourney';

export default function AcademyLayout() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div 
      className="lmx-page-bleed bg-slate-950 text-white relative font-sans selection:bg-indigo-500/30 selection:text-indigo-200"
      data-module="project"
    >
      {/* Top Sticky Scroll Progress Indicator */}
      <Motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 origin-left z-[100]" 
        style={{ scaleX }} 
      />

      {/* Floating background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-[140px]" />
      </div>

      {/* Top Floating Mini Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/60 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Code2 size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight flex items-center gap-2">
              Populate Engine Academy
              <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-900/40 px-2 py-0.5 rounded uppercase">
                Storyboard
              </span>
            </h1>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">
          Scroll Down to Begin Journey
        </div>
      </div>

      {/* Main scrolling section flow - using full bleed padding rules */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 md:py-20 space-y-24 md:space-y-36">
        <AcademyHero />
        <RequestJourney />
        <SecurityLayer />
        <CrudEngine />
        <FeatureBuilder />
        <DebuggingJourney />
      </div>
    </div>
  );
}
