import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

export default function AudioMessagePlayer({ src, duration = 0, isMe = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && totalDuration > 0) {
      const newTime = pos * totalDuration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const fmt = (sec) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  // Generate 24 pseudo-waveform bars
  const bars = [4, 8, 12, 6, 16, 20, 14, 10, 18, 22, 16, 8, 12, 18, 24, 16, 10, 14, 8, 18, 12, 6, 10, 4];

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-2xl w-full max-w-[300px] ${
      isMe ? "bg-indigo-700/60 text-white" : "bg-surface-1 border border-hairline text-ink"
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-xs ${
          isMe ? "bg-white text-indigo-700 hover:scale-105" : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
        }`}
      >
        {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="ml-0.5 fill-current" />}
      </button>

      {/* Waveform Scrubber */}
      <div className="flex-1 flex flex-col gap-1 cursor-pointer select-none" onClick={handleSeek}>
        <div className="flex items-center gap-0.5 h-6">
          {bars.map((h, i) => {
            const barPct = (i / bars.length) * 100;
            const isFilled = barPct <= progressPct;
            return (
              <span
                key={i}
                style={{ height: `${h}px` }}
                className={`w-1 rounded-full transition-colors ${
                  isFilled
                    ? isMe ? "bg-white" : "bg-indigo-600"
                    : isMe ? "bg-white/40" : "bg-hairline-strong"
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium opacity-80">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
