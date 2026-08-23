import React, { useState } from "react";
import { Sparkles, Cpu, BookOpen, CheckCircle, ArrowRight, AlertCircle, RefreshCw, PlusCircle, Check } from "lucide-react";
import api from "../../api/axiosInstance";

export default function JarvisTrainingStudio({ onTrainingComplete }) {
  // System training state
  const [systemTraining, setSystemTraining] = useState(false);
  const [systemTrainResult, setSystemTrainResult] = useState(null);

  // Neural distillation state
  const [neuralTraining, setNeuralTraining] = useState(false);
  const [neuralTrainResult, setNeuralTrainResult] = useState(null);

  // Custom teach state
  const [customUtterance, setCustomUtterance] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customRelation, setCustomRelation] = useState("");
  const [customObject, setCustomObject] = useState("");
  const [teachMode, setTeachMode] = useState("natural"); // 'natural' | 'triple'
  const [teaching, setTeaching] = useState(false);
  const [teachResult, setTeachResult] = useState(null);

  const [error, setError] = useState(null);

  // 1. Train System Schema
  const handleTrainSystem = async () => {
    setSystemTraining(true);
    setError(null);
    try {
      const res = await api.post("/jarvis/train-system");
      if (res.data?.success) {
        setSystemTrainResult(res.data.stats);
        if (typeof onTrainingComplete === "function") onTrainingComplete();
      } else {
        throw new Error(res.data?.error || "Failed to train system schema");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to train system schema");
    } finally {
      setSystemTraining(false);
    }
  };

  // 2. Run Neural Gradient Step
  const handleNeuralTrain = async () => {
    setNeuralTraining(true);
    setError(null);
    try {
      const res = await api.post("/jarvis/train");
      if (res.data?.success) {
        setNeuralTrainResult(res.data);
        if (typeof onTrainingComplete === "function") onTrainingComplete();
      } else {
        throw new Error(res.data?.message || res.data?.error || "Failed to run neural training");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to run neural training");
    } finally {
      setNeuralTraining(false);
    }
  };

  // 3. Teach Custom Fact
  const handleTeach = async (e) => {
    e.preventDefault();
    setTeaching(true);
    setError(null);
    setTeachResult(null);

    try {
      const payload =
        teachMode === "natural"
          ? { utterance: customUtterance }
          : { subject: customSubject, relation: customRelation, object: customObject };

      const res = await api.post("/jarvis/teach", payload);
      if (res.data?.success) {
        setTeachResult(res.data.message || res.data.response || "Knowledge committed to memory.");
        setCustomUtterance("");
        setCustomSubject("");
        setCustomRelation("");
        setCustomObject("");
        if (typeof onTrainingComplete === "function") onTrainingComplete();
      } else {
        throw new Error(res.data?.error || "Failed to teach fact");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to teach fact");
    } finally {
      setTeaching(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of 2 Primary Training Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: System Schema Training */}
        <div className="p-4 rounded-xl bg-[var(--tracker-surface)] border border-[var(--tracker-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-[#6c3de8]/10 text-[#6c3de8]">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--tracker-ink)]">
                  ERP System Schema Ingestion
                </h3>
                <p className="text-xs text-[var(--tracker-ink-muted)]">
                  Teaches J.A.R.V.I.S. all ERP modules, collections, roles &amp; workflows.
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--tracker-ink-muted)] mb-3 leading-relaxed">
              Extracts declarative entities and relationships from HRMS, Projects, Tasks, Tickets, Assets, CRM, and ABAC Policies directly into the Cognitive Brain.
            </p>

            {systemTrainResult && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                <div className="flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>System Ingestion Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-emerald-800 dark:text-emerald-200">
                  <div>Modules: {systemTrainResult.modulesCount}</div>
                  <div>Collections: {systemTrainResult.collectionsCount}</div>
                  <div>Triples: {systemTrainResult.triplesCount}</div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleTrainSystem}
            disabled={systemTraining}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6c3de8] to-[#8b5cf6] text-white text-xs font-semibold hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {systemTraining ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Ingesting ERP System Schema...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Train System Schema
              </>
            )}
          </button>
        </div>

        {/* Card 2: Neural Gradient Distillation */}
        <div className="p-4 rounded-xl bg-[var(--tracker-surface)] border border-[var(--tracker-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--tracker-ink)]">
                  Neural Gradient Distillation
                </h3>
                <p className="text-xs text-[var(--tracker-ink-muted)]">
                  Runs AdamW backprop across 15 epochs &amp; saves checkpoint.
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--tracker-ink-muted)] mb-3 leading-relaxed">
              Distills combinatorial prompt-target training pairs from the live graph and updates the 29,024 causal transformer weights (&theta;).
            </p>

            {neuralTrainResult && (
              <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>Optimization Step #{neuralTrainResult.step}</span>
                  <span className="font-mono text-[11px]">
                    Loss: {neuralTrainResult.initialLoss} &rarr; {neuralTrainResult.finalLoss} (&Delta; {neuralTrainResult.delta})
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-200">
                  Trained on {neuralTrainResult.trainPairs} distilled pairs &bull; Checkpoint saved to MongoDB.
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleNeuralTrain}
            disabled={neuralTraining}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {neuralTraining ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Optimizing Neural Weights (&theta;)...
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" />
                Run Neural Training Cycle (`train`)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card 3: Custom Fact Teaching Form */}
      <div className="p-4 rounded-xl bg-[var(--tracker-surface)] border border-[var(--tracker-border)] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[var(--brand-solid)]" />
            <h3 className="text-sm font-bold text-[var(--tracker-ink)]">
              Teach Custom Enterprise Fact / Memory
            </h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-[var(--tracker-surface-1)] p-0.5 border border-[var(--tracker-border-soft)] text-xs">
            <button
              type="button"
              onClick={() => setTeachMode("natural")}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all ${teachMode === "natural"
                ? "bg-[var(--brand-solid)] text-white shadow-xs"
                : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
                }`}
            >
              Natural Phrasing
            </button>
            <button
              type="button"
              onClick={() => setTeachMode("triple")}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all ${teachMode === "triple"
                ? "bg-[var(--brand-solid)] text-white shadow-xs"
                : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
                }`}
            >
              Semantic Triple
            </button>
          </div>
        </div>

        <form onSubmit={handleTeach} className="space-y-3">
          {teachMode === "natural" ? (
            <div>
              <label className="block text-xs font-semibold text-[var(--tracker-ink)] mb-1">
                Natural Teaching Sentence:
              </label>
              <input
                type="text"
                value={customUtterance}
                onChange={(e) => setCustomUtterance(e.target.value)}
                placeholder="e.g. Commander Rhea Sol commanded the Asteria Mission"
                className="w-full px-3.5 py-2 text-sm bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-xl text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] focus:outline-hidden focus:border-[var(--brand-solid)]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--tracker-ink)] mb-1">Subject Entity:</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full px-3 py-2 text-xs bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-xl text-[var(--tracker-ink)] focus:outline-hidden focus:border-[var(--brand-solid)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--tracker-ink)] mb-1">Relation:</label>
                <input
                  type="text"
                  value={customRelation}
                  onChange={(e) => setCustomRelation(e.target.value)}
                  placeholder="e.g. capital_of"
                  className="w-full px-3 py-2 text-xs bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-xl text-[var(--tracker-ink)] focus:outline-hidden focus:border-[var(--brand-solid)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--tracker-ink)] mb-1">Target Value / Object:</label>
                <input
                  type="text"
                  value={customObject}
                  onChange={(e) => setCustomObject(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full px-3 py-2 text-xs bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-xl text-[var(--tracker-ink)] focus:outline-hidden focus:border-[var(--brand-solid)]"
                />
              </div>
            </div>
          )}

          {teachResult && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{teachResult}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={teaching || (teachMode === "natural" ? !customUtterance.trim() : !customSubject.trim() || !customRelation.trim() || !customObject.trim())}
              className="px-4 py-2 rounded-xl bg-[var(--brand-solid)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-xs"
            >
              {teaching ? "Ingesting..." : "Commit Knowledge to Graph"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
