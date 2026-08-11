import { useState } from "react";
import toast from "react-hot-toast";
import { MdShare, MdCheck } from "react-icons/md";

const ShareButton = ({ model, id, className = "", variant = "button" }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const url = `${window.location.origin}/${model}/${id}`;
      // console.log('Copying URL:', url); // Debug log

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setIsCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error("Failed to copy link");
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        className={`p-1 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
        title="Copy link"
        type="button"
      >
        {isCopied ? <MdCheck size={16} className="text-green-500" /> : <MdShare size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2 ${className}`}
      type="button"
    >
      {isCopied ? <MdCheck size={16} /> : <MdShare size={16} />}
      {isCopied ? "Copied!" : "Share"}
    </button>
  );
};

export default ShareButton;