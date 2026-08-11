import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const FloatingCard = ({ onClose, children, title, size = "md" }) => {
  const cardRef = useRef();
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Animate out then close
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 200);
  };

  // Escape key
  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if click inside MUI popper (dropdown list)
      const inAutocomplete =
        e.target.closest('[role="presentation"]') ||
        e.target.closest('[role="listbox"]');
      if (inAutocomplete) return;

      if (cardRef.current && !cardRef.current.contains(e.target)) {
        handleClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  }[size] || "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 tracker-overlay backdrop-blur-[2px] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className={`
          relative w-full ${sizeClass} max-h-[90vh] flex flex-col
          bg-white
          rounded-[16px] shadow-lg
          border border-[#d3cec6]
          transition-all duration-200 ease-out
          ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-2'}
        `}
        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        {/* Header — only rendered if title is given, but close button is always present */}
        <div className={`flex items-center justify-between flex-shrink-0 ${title ? 'px-5 py-3.5 border-b border-[#ebe7e1]' : 'absolute top-3 right-3 z-10'}`}>
          {title && (
            <h2 className="text-[14px] font-medium text-[#111111]">{title}</h2>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-[6px] text-[#7b7b78] hover:text-[#111111] hover:bg-[#f5f1ec] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 text-[13px] text-[#111111]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FloatingCard;
