import React from "react";
import {
  Building2,
  FolderKanban,
  User,
  Clock,
  Calendar,
  FileText,
  Briefcase,
} from "lucide-react";

/* ─── Design tokens (DESIGN.md v2 — HR Tracker module) ─── */
const T = {
  canvas:       "#F7F8FC",
  surface0:     "#FFFFFF",
  surface1:     "#F0F2FA",
  border:       "#E2E5F0",
  borderSoft:   "#ECEEF7",
  ink:          "#1A1D2E",
  inkMuted:     "#4B5068",
  inkSubtle:    "#8890A8",
  inkTertiary:  "#B4BACC",
  hrAccent:     "#7C3AED",
  hrAccentLight:"#EDE9FE",
  hrAccentMid:  "#A78BFA",
  success:      "#10B981",
  successLight: "#D1FAE5",
  warning:      "#F59E0B",
  warningLight: "#FEF3C7",
  cardShadow:   "0 1px 3px rgba(108,61,232,0.06), 0 1px 2px rgba(0,0,0,0.04)",
};

/* ─── Helpers ─── */
const fmt = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

/* ─── Icon tile ─── */
const IconTile = ({ icon: Icon, color = T.hrAccent, bg = T.hrAccentLight }) => (
  <div
    style={{
      width: 40,
      height: 40,
      borderRadius: 8,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <Icon size={18} color={color} strokeWidth={1.8} />
  </div>
);

/* ─── Data row ─── */
const DataRow = ({ label, value, last = false }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      paddingBottom: last ? 0 : 14,
      marginBottom: last ? 0 : 14,
      borderBottom: last ? "none" : `1px solid ${T.borderSoft}`,
    }}
  >
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        color: T.inkSubtle,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 14,
        fontWeight: 400,
        color: value ? T.ink : T.inkTertiary,
        lineHeight: 1.55,
      }}
    >
      {value || "—"}
    </span>
  </div>
);

/* ─── Section card ─── */
const SectionCard = ({ icon, title, children }) => (
  <div
    style={{
      background: T.surface0,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      boxShadow: T.cardShadow,
      overflow: "hidden",
    }}
  >
    {/* Left accent bar + header */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "16px 20px",
        borderBottom: `1px solid ${T.borderSoft}`,
        borderLeft: `4px solid ${T.hrAccent}`,
      }}
    >
      <IconTile icon={icon} />
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: T.ink,
          letterSpacing: "-0.1px",
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "20px 20px 20px 24px" }}>{children}</div>
  </div>
);

/* ─── Activity hours row ─── */
const ActivityRow = ({ act, index, last }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      paddingBottom: last ? 0 : 16,
      marginBottom: last ? 0 : 16,
      borderBottom: last ? "none" : `1px solid ${T.borderSoft}`,
    }}
  >
    {/* Index badge */}
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: T.hrAccentLight,
        color: T.hrAccent,
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      {index + 1}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: act.remarks ? 6 : 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: T.ink,
            lineHeight: 1.4,
          }}
        >
          {act.description || "No description"}
        </span>

        {/* Hours chip */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.hrAccent,
            background: T.hrAccentLight,
            borderRadius: 9999,
            padding: "2px 10px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {act.hours || 0}h
        </span>
      </div>

      {act.remarks && (
        <p
          style={{
            fontSize: 13,
            color: T.inkMuted,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {act.remarks}
        </p>
      )}
    </div>
  </div>
);

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
const Activity = ({ activity }) => {
  if (!activity) return null;

  const totalHours = activity.activities?.reduce(
    (sum, a) => sum + (a.hours || 0),
    0
  ) ?? 0;

  const employeeName =
    activity.user?.basicInfo
      ? `${activity.user.basicInfo.firstName ?? ""} ${
          activity.user.basicInfo.lastName ?? ""
        }`.trim()
      : null;

  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── Hero summary bar ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${T.hrAccent} 0%, #A855F7 100%)`,
          borderRadius: 14,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          boxShadow: "0 4px 12px rgba(108,61,232,0.25)",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
              marginBottom: 4,
            }}
          >
            DAILY ACTIVITY
          </p>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {activity.activityType?.name || "Activity Details"}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.75)",
              marginTop: 4,
            }}
          >
            {fmtDate(activity.date)}
          </p>
        </div>

        {/* Total hours badge */}
        <div
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.30)",
            borderRadius: 12,
            padding: "14px 22px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1,
              margin: 0,
            }}
          >
            {totalHours}h
          </p>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              marginTop: 4,
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Total Hours
          </p>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {/* Assignment */}
        <SectionCard icon={User} title="Assignment">
          <DataRow label="Employee" value={employeeName} />
          <DataRow label="Activity Type" value={activity.activityType?.name} last />
        </SectionCard>

        {/* Project */}
        <SectionCard icon={FolderKanban} title="Project">
          <DataRow label="Client" value={activity.client?.name} />
          <DataRow label="Project Type" value={activity.projectType?.name} last />
        </SectionCard>
      </div>

      {/* ── Date & time ── */}
      <SectionCard icon={Calendar} title="Date & Time">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          <DataRow label="Date" value={fmtDate(activity.date)} />
          <DataRow
            label="Recorded At"
            value={fmt(activity.date)}
            last
          />
        </div>
      </SectionCard>

      {/* ── Activity breakdown ── */}
      {activity.activities && activity.activities.length > 0 && (
        <SectionCard icon={Briefcase} title="Activity Breakdown">
          {activity.activities.map((act, idx) => (
            <ActivityRow
              key={idx}
              act={act}
              index={idx}
              last={idx === activity.activities.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* ── Description / notes ── */}
      {activity.activity && (
        <SectionCard icon={FileText} title="Notes">
          <p
            style={{
              fontSize: 14,
              color: T.inkMuted,
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {activity.activity}
          </p>
        </SectionCard>
      )}
    </div>
  );
};

export default Activity;
