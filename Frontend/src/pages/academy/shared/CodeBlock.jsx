import React, { useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";

export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-100 overflow-x-auto group shadow-inner my-3 w-full">
      <pre className="pr-10 leading-relaxed text-left">{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/40 text-slate-400 hover:text-slate-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        title="Copy code"
      >
        {copied ? <MdCheck className="text-emerald-400 text-sm" /> : <MdContentCopy className="text-sm" />}
      </button>
    </div>
  );
}
