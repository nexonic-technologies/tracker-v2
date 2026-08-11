import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGenericAPI from "../../../components/useGenericAPI";
import { useAuth } from "../../../context/authProvider.jsx";
import {
  Plus, RefreshCw, CalendarDays, Clock, ChevronRight, Briefcase,
} from "lucide-react";

/* ─── Design tokens — HR Tracker (DESIGN.md v2) ─── */
const T = {
  canvas: "#F7F8FC",
  surface0: "#FFFFFF",
  surface1: "#F0F2FA",
  border: "#E2E5F0",
  borderSoft: "#ECEEF7",
  ink: "#1A1D2E",
  inkMuted: "#4B5068",
  inkSubtle: "#8890A8",
  inkTertiary: "#B4BACC",
  hrAccent: "#7C3AED",
  hrAccentLight: "#EDE9FE",
  hrAccentMid: "#A78BFA",
  success: "#10B981",
  successLight: "#D1FAE5",
  cardShadow: "0 1px 3px rgba(108,61,232,0.06), 0 1px 2px rgba(0,0,0,0.04)",
};

/* ─── Helpers ─── */
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/* ─── Activity card ─── */
const ActivityCard = ({ activity, onClick }) => {
  const acts = activity.activities || [];
  const totalHours =
    activity.totalHours ??
    acts.reduce((s, a) => s + (a.hours || 0), 0);

  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface0,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        boxShadow: T.cardShadow,
        borderLeft: `4px solid ${T.hrAccent}`,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 4px 12px rgba(108,61,232,0.12), 0 2px 4px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = T.cardShadow;
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: T.hrAccentLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Briefcase size={18} color={T.hrAccent} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Date + total hours */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDays size={13} color={T.inkSubtle} strokeWidth={1.8} />
            <span style={{ fontSize: 12, color: T.inkMuted }}>
              {formatDate(activity.date)}
            </span>
          </div>

          {/* Total hours chip */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.hrAccent,
              background: T.hrAccentLight,
              borderRadius: 9999,
              padding: "2px 10px",
            }}
          >
            {totalHours}h total
          </span>
        </div>

        {/* Sub-activities */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {acts.slice(0, 3).map((act, i) => (
            <div
              key={i}
              style={{
                background: T.surface1,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: T.ink,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {act.description || "No description"}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <Clock size={12} color={T.inkSubtle} strokeWidth={1.8} />
                <span style={{ fontSize: 12, color: T.inkMuted }}>
                  {act.hours || 0}h
                </span>
              </div>
            </div>
          ))}
          {acts.length > 3 && (
            <span style={{ fontSize: 12, color: T.inkSubtle, paddingLeft: 4 }}>
              +{acts.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        size={16}
        color={T.inkTertiary}
        strokeWidth={1.8}
        style={{ flexShrink: 0, marginTop: 12 }}
      />
    </div>
  );
};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
const DailyTracker = () => {
  const [data, setData] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { read, loading } = useGenericAPI();

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      try {
        const res = await read("daily_activities", {
          filter: { employee: user.id },
          populateFields: { employee: "basicInfo.firstName,basicInfo.lastName" },
          sort: { date: -1 },
        });
        setData(res?.data || []);
      } catch {
        // error toast handled by useGenericAPI
      }
    };
    fetchData();
  }, [refresh, user]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: T.canvas,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: `3px solid ${T.hrAccentLight}`,
            borderTopColor: T.hrAccent,
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: T.canvas,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 16px",
          flexShrink: 0,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: T.hrAccent,
              marginBottom: 2,
            }}
          >
            HR TRACKER
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: T.ink,
              letterSpacing: "-0.3px",
            }}
          >
            Daily Activities
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Refresh */}
          <button
            onClick={() => setRefresh((p) => !p)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = T.surface1)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = T.surface0)
            }
            title="Refresh"
          >
            <RefreshCw size={15} color={T.inkMuted} strokeWidth={1.8} />
          </button>

          {/* Add Activity */}
          <button
            onClick={() =>
              navigate("/Attendance/Daily-tracker/add-daily-activity")
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 16px",
              height: 36,
              borderRadius: 8,
              background: T.hrAccent,
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124,58,237,0.30)",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={16} strokeWidth={2} />
            Add Activity
          </button>
        </div>
      </div>

      {/* ── List ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {data.length > 0 ? (
          <>
            <p
              style={{
                fontSize: 12,
                color: T.inkSubtle,
                marginBottom: 4,
              }}
            >
              {data.length} record{data.length !== 1 ? "s" : ""}
            </p>
            {data.map((activity) => (
              <ActivityCard
                key={activity._id}
                activity={activity}
                onClick={() =>
                  navigate(
                    `/Attendance/Daily-tracker/activity/${activity._id}`
                  )
                }
              />
            ))}
          </>
        ) : (
          /* ── Empty state ── */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "48px 24px",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: T.hrAccentLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Briefcase size={26} color={T.hrAccent} strokeWidth={1.6} />
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: T.ink,
                marginBottom: 6,
              }}
            >
              No activities yet
            </p>
            <p
              style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}
            >
              Start by logging your first daily activity
            </p>
            <button
              onClick={() =>
                navigate("/Attendance/Daily-tracker/add-daily-activity")
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 8,
                background: T.hrAccent,
                border: "none",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(124,58,237,0.30)",
              }}
            >
              <Plus size={16} strokeWidth={2} />
              Add Activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTracker;