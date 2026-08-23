import React, { useState, useEffect } from "react";
import { MessageSquare, Cpu, Database, Sparkles } from "lucide-react";
import api from "../../api/axiosInstance";
import JarvisTelemetryHeader from "./JarvisTelemetryHeader";
import JarvisChatInterface from "./JarvisChatInterface";
import JarvisTrainingStudio from "./JarvisTrainingStudio";
import JarvisKnowledgeExplorer from "./JarvisKnowledgeExplorer";

export default function JarvisCognitiveStudio() {
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'training' | 'explorer'
  const [activeMode, setActiveMode] = useState("full"); // 'full' | 'symbolic' | 'neural'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/jarvis/stats");
      if (res.data?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch Jarvis stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-[var(--tracker-canvas)] flex flex-col overflow-hidden">
      {/* Dynamic Telemetry Header with Full-Width Extent */}
      <JarvisTelemetryHeader
        stats={stats}
        loading={loading}
        onRefresh={fetchStats}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Full-Screen Studio Body (Zero Artificial Margins) */}
      <div className="flex-1 w-full p-2 md:p-3 flex flex-col min-h-0 overflow-hidden">
        {/* Tab Content Panels (100% Fluid Height & Width) */}
        {activeTab === "chat" && <JarvisChatInterface activeMode={activeMode} />}
        {activeTab === "training" && (
          <div className="flex-1 overflow-y-auto">
            <JarvisTrainingStudio onTrainingComplete={fetchStats} />
          </div>
        )}
        {activeTab === "explorer" && (
          <div className="flex-1 overflow-y-auto">
            <JarvisKnowledgeExplorer />
          </div>
        )}
      </div>
    </div>
  );
}
