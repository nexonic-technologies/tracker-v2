import React from 'react';

const ModernLoader = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-[16px] shadow-lg border border-[#d3cec6] p-8 flex flex-col items-center space-y-4" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div className="relative">
          <div className="w-14 h-14 border-[3px] border-[#ebe7e1] rounded-full"></div>
          <div className="w-14 h-14 border-[3px] border-[#111111] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-[14px] text-[#626260] font-medium">{message}</p>
      </div>
    </div>
  );
};

export default ModernLoader;