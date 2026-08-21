import { useState, useEffect, useRef } from "react";
import { Mic, Trash2, Send, Pause, Play } from "lucide-react";
import toast from "react-hot-toast";

export default function VoiceRecorderBar({ onSendAudio, onCancel }) {
  const [isRecording, setIsRecording] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopMediaTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 120) { // Auto-stop at 2 minutes
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone permission denied");
      onCancel();
    }
  };

  const stopMediaTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      stopMediaTracks();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleSend = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          stopMediaTracks();
          if (blob.size > 5 * 1024 * 1024) {
            toast.error("Voice note exceeds 5MB limit");
            return;
          }
          onSendAudio(blob, recordingTime);
        };
        mediaRecorderRef.current.stop();
      }
    } else if (audioBlob) {
      if (audioBlob.size > 5 * 1024 * 1024) {
        toast.error("Voice note exceeds 5MB limit");
        return;
      }
      onSendAudio(audioBlob, recordingTime);
    }
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex items-center justify-between w-full bg-surface-1 border border-hairline rounded-tracker-pill px-4 py-2 text-xs animate-fade-in shadow-xs">
      {/* Left: Pulsing Red Recording Dot & Timer */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          {isRecording && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />}
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
        </span>
        <span className="font-mono text-xs font-bold text-ink">{fmtTime(recordingTime)}</span>
        <span className="text-[10px] text-ink-subtle hidden sm:inline">
          {isRecording ? "Recording voice note..." : "Ready to send"}
        </span>
      </div>

      {/* Center: Animated Voice Waveform */}
      {isRecording && (
        <div className="flex items-center gap-1 h-5 mx-4">
          {[12, 20, 8, 16, 24, 14, 18, 10, 22, 16, 8, 14].map((h, i) => (
            <span
              key={i}
              className="w-1 bg-indigo-500 rounded-full animate-pulse"
              style={{
                height: `${h}px`,
                animationDelay: `${(i % 4) * 0.15}s`,
                animationDuration: "0.8s"
              }}
            />
          ))}
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Cancel / Trash Button */}
        <button
          type="button"
          onClick={() => {
            stopMediaTracks();
            if (timerRef.current) clearInterval(timerRef.current);
            onCancel();
          }}
          className="p-1.5 hover:bg-rose-50 text-ink-muted hover:text-rose-600 rounded-full transition-colors cursor-pointer"
          title="Cancel recording"
        >
          <Trash2 size={16} />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Send size={13} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
