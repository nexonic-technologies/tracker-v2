import { motion as Motion } from "framer-motion";
import { Shield, KeyRound, Lock, UserCheck, CheckCircle2, XCircle, ArrowDown } from "lucide-react";
import CodeBlock from "./shared/CodeBlock";

export default function SecurityLayer() {
  return (
    <section className="relative space-y-16">
      
      {/* Chapter header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">
          🛡️ Identity Guard
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-white">
          The Security Gateway
        </h2>
        <p className="text-slate-400 text-xs md:text-sm">
          Every request must earn access. Scroll through to trace the Allowed vs. Denied policy decision pathways.
        </p>
      </div>

      {/* Visual Conduit Gate Layout */}
      <div className="max-w-4xl mx-auto space-y-20">
        
        {/* Gate 1: Checkpoints pipeline */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-[28px] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
          
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <Lock className="text-emerald-400" size={16} />
            The 4 Security Auditing checkposts
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "1. Authentication", icon: KeyRound, desc: "JWT signature validator & session certificate audit." },
              { title: "2. Identity Loading", icon: UserCheck, desc: "Binds user metadata & active role properties to request context." },
              { title: "3. Policy Engine", icon: Shield, desc: "Evaluates RBAC permissions matches against Policy registry tables." },
              { title: "4. Context Condition", icon: Lock, desc: "Verifies fine-grained ownership criteria (isSelf, isManager) dynamically." }
            ].map((gate, idx) => {
              const Icon = gate.icon;
              return (
                <Motion.div
                  key={gate.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-950 border border-slate-900 p-5 rounded-2xl space-y-3 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300"
                >
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit group-hover:scale-105 transition-transform">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{gate.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{gate.desc}</p>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </div>

        {/* Gate 2: Path of the Allowed Request */}
        <Motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-12 gap-8 items-center"
        >
          {/* Visual Channel representation */}
          <div className="md:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[9px] font-mono font-bold uppercase tracking-wider">
              Channel A: Allowed Request
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white">
              Employee Reading Own Attendance
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              The user role `Employee` has permissions to read their own data. 
              The Policy Engine automatically verifies that `doc.employeeId` equals `user._id`, injecting the safety filters into Mongoose on the fly.
            </p>

            <div className="flex gap-2.5 items-center p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 text-emerald-400">
              <CheckCircle2 size={18} className="shrink-0" />
              <span className="text-[10px] font-mono font-semibold">Policy Verdict: ACCESS GRANTED (Query filter injected)</span>
            </div>
          </div>

          {/* Logic & Code CodeBlock */}
          <div className="md:col-span-7 bg-slate-950 border border-slate-900 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute top-2 right-3 rounded bg-slate-900/80 px-2 py-0.5 border border-white/5 font-mono text-[8px] text-emerald-400 uppercase">
              Condition Passed
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Policy Code verification:</span>
            <CodeBlock code={`// backend/src/utils/policy/attendancePolicy.js
export const attendancePolicy = {
  read: async (user, doc) => {
    // PASS: Employee matches employeeId property (registry.isSelf)
    return user.role === "Admin" || 
      doc.employeeId.toString() === user._id.toString();
  }
};`} />
          </div>
        </Motion.div>

        {/* Gate 3: Path of the Denied Request */}
        <Motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-12 gap-8 items-center md:flex-row-reverse"
        >
          {/* Visual Channel representation */}
          <div className="md:col-span-5 space-y-4 md:order-last">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/30 text-[9px] font-mono font-bold uppercase tracking-wider">
              Channel B: Blocked Request
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white">
              Employee Altering Admin settings
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              The user role `Employee` attempts to alter administrative rules. 
              The Policy Engine runs an RBAC audit, checks permissions, and blocks the request at the gateway before any DB writes occur.
            </p>

            <div className="flex gap-2.5 items-center p-3 rounded-2xl bg-red-500/5 border border-red-500/25 text-red-400">
              <XCircle size={18} className="shrink-0" />
              <span className="text-[10px] font-mono font-semibold">Policy Verdict: ACCESS DENIED (403 Forbidden)</span>
            </div>
          </div>

          {/* Logic & Code CodeBlock */}
          <div className="md:col-span-7 bg-slate-950 border border-slate-900 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute top-2 right-3 rounded bg-slate-900/80 px-2 py-0.5 border border-white/5 font-mono text-[8px] text-red-400 uppercase">
              Blocked by RBAC
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Policy Code verification:</span>
            <CodeBlock code={`// backend/src/utils/policy/adminSettingsPolicy.js
export const settingsPolicy = {
  update: async (user) => {
    // FAIL: Role "Employee" is not included in write array
    return ["Admin"].includes(user.role); 
  }
};`} />
          </div>
        </Motion.div>

      </div>

      {/* Chapter spacer */}
      <div className="flex justify-center pt-8">
        <Motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-1 text-slate-600"
        >
          <span className="text-[9px] font-mono uppercase tracking-widest">Scroll to CRUD Factory</span>
          <ArrowDown size={14} />
        </Motion.div>
      </div>

    </section>
  );
}