import React from "react";
import { Link } from "react-router-dom";

export default function ActionCard({ title, icon: Icon, to, colors }) {
  return (
    <Link
      to={to}
      className="cursor-pointer p-4 rounded-[12px] border border-[#d3cec6] bg-white hover:bg-[#f5f1ec]/50 flex items-center gap-4 transition-all duration-200 text-[#111111] min-w-[250px] max-w-[250px]"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Icon */}
      <div 
        className="p-3 rounded-[8px]"
        style={{ backgroundColor: colors?.[0] || '#111111' }}
      >
        <Icon size={24} color="#fff" />
      </div>

      {/* Title */}
      <p className="text-[15px] font-medium">{title}</p>
    </Link>
  );
}
