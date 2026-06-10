import { useState, useEffect, useCallback } from "react";
import { fetchPastSnapshots, DailySnapshot } from "../firebase";
import { HABIT_GROUPS } from "../data/constants";

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────
const C = {
  bg:      "#0A0A0D",
  surface: "#141418",
  border:  "#1E1E28",
  text:    "#E8E4DC",
  muted:   "#666",
  dim:     "#333",
  accent:  "#C8A96E",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const allHabitIds = HABIT_GROUPS.flatMap(g => g.habits.map(h => h.id));

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "#7EC8A9";
  if (pct >= 50) return "#C8A96E";
  return "#E8735A";
}

function getHabitCountForDay(snapshot: DailySnapshot): { done: number; total: number } {
  const done = allHabitIds.filter(id => snapshot.completedHabits[`${snapshot.date}_${id}`]).length;
  return { done, total: allHabitIds.length };
}

function getGroupCountForDay(snapshot: DailySnapshot, groupId: string) {
  const group = HABIT_GROUPS.find(g => g.id === groupId);
  if (!group) return { done: 0, total: 0 };
  const done = group.habits.filter(h => snapshot.completedHabits[`${snapshot.date}_${h.id}`]).length;
  return { done, total: group.habits.length };
}

// ─── STREAK CALCULATOR ────────────────────────────────────────────────────────
function calcStreak(snapshots: DailySnapshot[]): number {
  if (!snapshots.length) return 0;
  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let expected = new Date().toISOString().split("T")[0];
  for (const s of sorted) {
    if (s.date === expected && s.habitPct > 0) {
      streak++;
      const d = new Date(expected + "T00:00:00");
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().split("T")[0];
    } else {
      break;
    }
  }
  return streak;
}

// ─── HISTORY PAGE COMPONENT ───────────────────────────────────────────────────
interface HistoryPageProps {
  /** Live today's data passed down from parent so it shows up without a round-trip */
  todaySnapshot: Omit<DailySnapshot, "savedAt"> | null;
}

export default function HistoryPage({ todaySnapshot }: HistoryPageProps) {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DailySnapshot | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPastSnapshots(60);
      setSnapshots(data);
    } catch {
      setError("Could not load history. Check your Firebase config.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const streak = calcStreak(snapshots);
  const avgPct = snapshots.length
    ? Math.round(snapshots.reduce((acc, s) => acc + s.habitPct, 0) / snapshots.length)
    : 0;
  const bestDay = snapshots.reduce((best, s) => s.habitPct > (best?.habitPct ?? -1) ? s : best, null as DailySnapshot | null);

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const { done, total } = getHabitCountForDay(selected);
    return (
      <div className="page-enter">
        {/* Back button */}
        <button
          onClick={() => { setView("list"); setSelected(null); }}
          style={{
            display: "flex", alignItems: "center", gap: "6px", background: "none",
            border: "none", color: C.accent, fontSize: "12px", fontWeight: 700,
            cursor: "pointer", padding: "0 0 14px", letterSpacing: "1px",
          }}
        >
          ← BACK
        </button>

        {/* Day header */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "6px" }}>
            {isToday(selected.date) ? "TODAY" : formatDate(selected.date)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: "48px", fontWeight: 900, color: scoreColor(selected.habitPct), lineHeight: 1, letterSpacing: "-2px" }}>{selected.habitPct}%</div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>{done} of {total} habits</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {selected.bodyStats && (
                <>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: C.accent }}>{selected.bodyStats.weight}kg</div>
                  <div style={{ fontSize: "10px", color: C.muted }}>{selected.bodyStats.bf}% BF</div>
                </>
              )}
            </div>
          </div>
          {/* Full progress bar */}
          <div style={{ height: "4px", background: C.dim, borderRadius: "2px", marginTop: "14px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${selected.habitPct}%`, background: `linear-gradient(90deg, #E8735A, #C8A96E, #7EC8A9)`, borderRadius: "2px", transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Per-category breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "14px", fontWeight: 600 }}>Category Breakdown</div>
          {HABIT_GROUPS.map(group => {
            const { done: gd, total: gt } = getGroupCountForDay(selected, group.id);
            const gpct = Math.round((gd / gt) * 100);
            return (
              <div key={group.id} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: group.color, fontSize: "12px" }}>{group.icon}</span>
                    <span style={{ fontSize: "12px", color: C.text }}>{group.label}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: gd === gt ? "#7EC8A9" : group.color, fontWeight: 700 }}>{gd}/{gt}</span>
                </div>
                <div style={{ height: "4px", background: C.dim, borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${gpct}%`, background: group.color, borderRadius: "2px", transition: "width 0.4s" }} />
                </div>
                {/* Individual habits */}
                <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {group.habits.map(h => {
                    const isDone = !!selected.completedHabits[`${selected.date}_${h.id}`];
                    return (
                      <span key={h.id} style={{
                        fontSize: "9px", padding: "2px 7px", borderRadius: "4px",
                        background: isDone ? group.color + "22" : "#0C0C0F",
                        color: isDone ? group.color : C.muted,
                        border: `1px solid ${isDone ? group.color + "55" : C.dim}`,
                        textDecoration: isDone ? "none" : "line-through",
                      }}>
                        {isDone ? "✓" : "✗"} {h.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Body stats snapshot */}
        {selected.bodyStats && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>Body Stats That Day</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { label: "Weight",     value: selected.bodyStats.weight + "kg", color: C.accent },
                { label: "Body Fat",   value: selected.bodyStats.bf + "%",       color: "#E8735A" },
                { label: "Waist",      value: selected.bodyStats.waist + '"',    color: "#8FA8D8" },
                { label: "Chest",      value: selected.bodyStats.chest + '"',    color: "#7EC8A9" },
                { label: "Shoulder",   value: selected.bodyStats.shoulder + '"', color: "#9B8EC4" },
                { label: "Bicep Flex", value: selected.bodyStats.bicepFlex + '"',color: C.accent },
              ].map(s => (
                <div key={s.label} style={{ background: "#0C0C0F", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "8px", color: C.muted, marginTop: "2px", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List / overview ──────────────────────────────────────────────────────────
  return (
    <div className="page-enter">
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
        {[
          { label: "Streak",   value: `${streak}d`,  color: "#E8735A",  icon: "🔥" },
          { label: "Avg Score",value: `${avgPct}%`,  color: C.accent,   icon: "◎" },
          { label: "Days Logged",value: `${snapshots.length}`, color: "#7EC8A9", icon: "◆" },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: "18px", marginBottom: "4px" }}>{s.icon}</div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "9px", color: C.muted, marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Best day callout */}
      {bestDay && (
        <div
          style={{ background: "#7EC8A912", border: "1px solid #7EC8A933", borderRadius: "12px", padding: "12px 16px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => { setSelected(bestDay); setView("detail"); }}
        >
          <div>
            <div style={{ fontSize: "9px", color: "#7EC8A9", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "3px" }}>🏆 Best Day</div>
            <div style={{ fontSize: "12px", color: C.text }}>{formatDate(bestDay.date)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#7EC8A9", lineHeight: 1 }}>{bestDay.habitPct}%</div>
            <div style={{ fontSize: "9px", color: C.muted }}>tap to view ›</div>
          </div>
        </div>
      )}

      {/* Mini bar chart — last 14 days */}
      {snapshots.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "14px", fontWeight: 600 }}>Last 14 Days</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "60px" }}>
            {snapshots.slice(0, 14).reverse().map((s, i) => (
              <div
                key={i}
                onClick={() => { setSelected(s); setView("detail"); }}
                title={`${formatDateShort(s.date)} — ${s.habitPct}%`}
                style={{
                  flex: 1, height: `${Math.max(4, (s.habitPct / 100) * 60)}px`,
                  background: scoreColor(s.habitPct),
                  borderRadius: "3px 3px 0 0", cursor: "pointer",
                  opacity: 0.85, transition: "opacity 0.15s",
                  minWidth: "12px",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "8px", color: C.muted }}>{snapshots.length >= 14 ? formatDateShort(snapshots[13].date) : formatDateShort(snapshots[snapshots.length - 1].date)}</span>
            <span style={{ fontSize: "8px", color: C.muted }}>Today</span>
          </div>
        </div>
      )}

      {/* Loading / error / empty */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "2px" }}>LOADING HISTORY...</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ background: "#E8735A12", border: "1px solid #E8735A33", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: "#E8735A", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>⚠ Firebase Not Connected</div>
          <div style={{ fontSize: "11px", color: C.muted, lineHeight: 1.6 }}>
            Open <code style={{ color: C.accent }}>src/firebase.ts</code> and replace the placeholder config with your Firebase project credentials to enable cloud history sync.
          </div>
          <div style={{ marginTop: "10px", fontSize: "10px", color: C.muted, lineHeight: 1.8 }}>
            1. Go to <span style={{ color: C.accent }}>console.firebase.google.com</span><br />
            2. Create project → Add Web App<br />
            3. Copy <code style={{ color: C.accent }}>firebaseConfig</code> into firebase.ts<br />
            4. Enable Firestore in test mode
          </div>
        </div>
      )}

      {!loading && !error && snapshots.length === 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "30px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px" }}>📅</div>
          <div style={{ fontSize: "13px", color: C.text, marginBottom: "6px", fontWeight: 700 }}>No History Yet</div>
          <div style={{ fontSize: "11px", color: C.muted, lineHeight: 1.6 }}>Complete habits today and your progress will be saved to Firebase automatically.</div>
        </div>
      )}

      {/* Daily log list */}
      {!loading && !error && snapshots.length > 0 && (
        <div>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "10px", fontWeight: 600 }}>All Days</div>
          {snapshots.map((s, i) => {
            const { done, total } = getHabitCountForDay(s);
            return (
              <div
                key={i}
                className="habit-item"
                onClick={() => { setSelected(s); setView("detail"); }}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: "12px", padding: "14px 16px", marginBottom: "8px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
                }}
              >
                {/* Score circle */}
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                  background: scoreColor(s.habitPct) + "18",
                  border: `2px solid ${scoreColor(s.habitPct)}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column",
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 900, color: scoreColor(s.habitPct), lineHeight: 1 }}>{s.habitPct}</div>
                  <div style={{ fontSize: "7px", color: C.muted }}>%</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: isToday(s.date) ? C.accent : C.text }}>
                      {isToday(s.date) ? "Today" : formatDate(s.date)}
                    </span>
                    <span style={{ fontSize: "9px", color: C.muted }}>›</span>
                  </div>
                  <div style={{ fontSize: "10px", color: C.muted, marginBottom: "5px" }}>{done}/{total} habits · {s.bodyStats?.weight ?? "—"}kg</div>
                  {/* Mini category dots */}
                  <div style={{ display: "flex", gap: "3px" }}>
                    {HABIT_GROUPS.map(g => {
                      const { done: gd, total: gt } = getGroupCountForDay(s, g.id);
                      const full = gd === gt;
                      return (
                        <div key={g.id} style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          background: full ? g.color : g.color + "33",
                          border: `1px solid ${g.color}55`,
                        }} />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh button */}
      {!loading && (
        <button
          onClick={load}
          style={{
            width: "100%", marginTop: "10px", padding: "11px",
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: "10px", color: C.muted, fontSize: "11px",
            cursor: "pointer", letterSpacing: "1px",
          }}
        >
          ↻ Refresh
        </button>
      )}
    </div>
  );
}
