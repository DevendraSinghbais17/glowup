import { useState, useEffect, useCallback } from "react";
import { Preferences } from "@capacitor/preferences";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
  HABIT_GROUPS,
  GYM_DAYS,
  SKINCARE,
  NUTRITION_PHASES,
  INITIAL_SCORES,
  POTENTIAL_SCORES,
  BODY_BASELINE,
  BodyStats,
} from "../data/constants";
import { saveDailySnapshot } from "../firebase";
import HistoryPage from "./History";

// ─── HAPTIC HELPER ───────────────────────────────────────────────────────────
const hapticTap = () => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch {} };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split("T")[0];

// Capacitor Preferences wrapper (replaces window.storage)
const storage = {
  get: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  set: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },
};

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0D",
  surface: "#141418",
  border: "#1E1E28",
  text: "#E8E4DC",
  muted: "#666",
  dim: "#333",
  accent: "#C8A96E",
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Today",     icon: "◉" },
  { id: "habits",     label: "Habits",    icon: "✦" },
  { id: "gym",        label: "Gym",       icon: "◈" },
  { id: "nutrition",  label: "Nutrition", icon: "◎" },
  { id: "skincare",   label: "Skin",      icon: "◬" },
  { id: "stats",      label: "Stats",     icon: "◆" },
  { id: "history",    label: "History",   icon: "📅" },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function MasterTracker() {
  const [nav, setNav] = useState("dashboard");
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>({});
  const [activeGymDay, setActiveGymDay] = useState<number | null>(null);
  const [activeNutritionPhase, setActiveNutritionPhase] = useState(0);
  const [activeSkinTab, setActiveSkinTab] = useState("am");
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [bodyStats, setBodyStats] = useState<BodyStats>(BODY_BASELINE);
  const [tempStats, setTempStats] = useState<BodyStats>(BODY_BASELINE);
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const today = todayKey();

  // ── Load from Capacitor Preferences ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const keys = ["habits", "gymDay", "nutPhase", "exercises", "bodyStats", "streak"];
        for (const k of keys) {
          try {
            const r = await storage.get(k);
            if (r) {
              const v = JSON.parse(r);
              if (k === "habits")     setCompletedHabits(v);
              if (k === "gymDay")     setActiveGymDay(v);
              if (k === "nutPhase")   setActiveNutritionPhase(v);
              if (k === "exercises")  setCompletedExercises(v);
              if (k === "bodyStats")  { setBodyStats(v); setTempStats(v); }
              if (k === "streak")     setStreak(v);
            }
          } catch { /* skip malformed values */ }
        }
      } catch { /* storage unavailable */ }
      setLoaded(true);
    };
    load();
  }, []);

  // ── Save to Capacitor Preferences ────────────────────────────────────────────
  const save = async (key: string, value: unknown) => {
    try {
      await storage.set(key, JSON.stringify(value));
    } catch { /* storage unavailable */ }
  };

  // ── Firebase sync helper — debounced, saves today's full snapshot ─────────────
  const syncToFirebase = useCallback(
    async (habits: Record<string, boolean>, exercises: Record<string, boolean>, stats: BodyStats, pct: number) => {
      await saveDailySnapshot({
        date: todayKey(),
        completedHabits: habits,
        completedExercises: exercises,
        bodyStats: stats as unknown as Record<string, number>,
        habitPct: pct,
      });
    },
    []
  );

  // ── Habit helpers ─────────────────────────────────────────────────────────────
  const toggleHabit = (habitId: string) => {
    hapticTap();
    const key = `${today}_${habitId}`;
    const updated = { ...completedHabits, [key]: !completedHabits[key] };
    setCompletedHabits(updated);
    save("habits", updated);
    // Compute updated pct inline for Firebase
    const allHabits = HABIT_GROUPS.flatMap(g => g.habits);
    const doneCnt = allHabits.filter(h => !!updated[`${today}_${h.id}`]).length;
    const newPct = Math.round((doneCnt / allHabits.length) * 100);
    syncToFirebase(updated, completedExercises, bodyStats, newPct);
  };

  const toggleExercise = (exKey: string) => {
    hapticTap();
    const updated = { ...completedExercises, [exKey]: !completedExercises[exKey] };
    setCompletedExercises(updated);
    save("exercises", updated);
    const allHabits = HABIT_GROUPS.flatMap(g => g.habits);
    const doneCnt = allHabits.filter(h => !!completedHabits[`${today}_${h.id}`]).length;
    const curPct = Math.round((doneCnt / allHabits.length) * 100);
    syncToFirebase(completedHabits, updated, bodyStats, curPct);
  };

  const isHabitDone = (habitId: string) => !!completedHabits[`${today}_${habitId}`];

  const getTodayCompletion = () => {
    const allHabits = HABIT_GROUPS.flatMap(g => g.habits);
    const done = allHabits.filter(h => isHabitDone(h.id)).length;
    return { done, total: allHabits.length, pct: Math.round((done / allHabits.length) * 100) };
  };

  const getGroupCompletion = (group: typeof HABIT_GROUPS[0]) => {
    const done = group.habits.filter(h => isHabitDone(h.id)).length;
    return { done, total: group.habits.length };
  };

  const saveStats = () => {
    setBodyStats(tempStats);
    save("bodyStats", tempStats);
    setSaveMsg("Saved ✓");
    setTimeout(() => setSaveMsg(""), 2000);
    // Also sync body stats update to Firebase
    const allHabits = HABIT_GROUPS.flatMap(g => g.habits);
    const doneCnt = allHabits.filter(h => isHabitDone(h.id)).length;
    const curPct = Math.round((doneCnt / allHabits.length) * 100);
    syncToFirebase(completedHabits, completedExercises, tempStats, curPct);
  };

  const { done, total, pct } = getTodayCompletion();
  const nutPhase = NUTRITION_PHASES[activeNutritionPhase];

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div className="loading-spinner" />
      <div className="loading-pulse" style={{ color: C.accent, fontSize: "11px", letterSpacing: "3px", fontWeight: 700 }}>LOADING</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','Roboto',system-ui,sans-serif", paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }} className="scroll-container">

      {/* ── HEADER ── */}
      <div className="app-header bottom-nav" style={{ background: "#0F0F14", borderBottom: `1px solid ${C.border}`, padding: "14px 20px 14px", paddingTop: "calc(14px + env(safe-area-inset-top, 0px))", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span style={{ fontSize: "10px", letterSpacing: "3px", color: C.accent, fontWeight: 700 }}>UMAX AI</span>
              <span style={{ color: C.dim }}>◆</span>
              <span style={{ fontSize: "10px", letterSpacing: "2px", color: C.muted }}>MASTER TRACKER</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.3px" }}>Dev's Glow-Up OS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "26px", fontWeight: 900, color: pct === 100 ? "#7EC8A9" : pct > 60 ? C.accent : "#E8735A", lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: "10px", color: C.muted, marginTop: "3px" }}>{done}/{total} today</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: "4px", background: C.dim, borderRadius: "2px", marginTop: "12px", overflow: "hidden" }}>
          <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #E8735A, #C8A96E, #7EC8A9)", borderRadius: "2px" }} />
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>

        {/* ── DASHBOARD ── */}
        {nav === "dashboard" && (
          <div className="page-enter">
            {/* Aesthetic scores */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "14px", fontWeight: 600 }}>Aesthetic Baseline → Potential</div>
              {[
                { label: "Bone Structure", id: "bone" as keyof typeof INITIAL_SCORES, color: "#C8A96E" },
                { label: "Skin Quality",   id: "skin" as keyof typeof INITIAL_SCORES, color: "#E8735A" },
                { label: "Hair & Grooming",id: "hair" as keyof typeof INITIAL_SCORES, color: "#7EC8A9" },
                { label: "Eye Area",       id: "eyes" as keyof typeof INITIAL_SCORES, color: "#8FA8D8" },
              ].map(cat => (
                <div key={cat.id} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: C.text }}>{cat.label}</span>
                    <span style={{ fontSize: "11px", color: cat.color, fontWeight: 700 }}>
                      {INITIAL_SCORES[cat.id]} → <span style={{ color: "#7EC8A9" }}>{POTENTIAL_SCORES[cat.id]}</span>
                    </span>
                  </div>
                  <div style={{ height: "5px", background: C.dim, borderRadius: "3px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", height: "100%", width: `${POTENTIAL_SCORES[cat.id]}%`, background: cat.color + "33", borderRadius: "3px" }} />
                    <div style={{ position: "absolute", height: "100%", width: `${INITIAL_SCORES[cat.id]}%`, background: cat.color, borderRadius: "3px" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "12px", background: "#0C0C0F", borderRadius: "8px", padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#E8735A" }}>58</div>
                  <div style={{ fontSize: "9px", color: C.muted }}>BASELINE</div>
                </div>
                <div style={{ color: C.dim, alignSelf: "center", fontSize: "18px" }}>→</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#7EC8A9" }}>76</div>
                  <div style={{ fontSize: "9px", color: C.muted }}>POTENTIAL</div>
                </div>
                <div style={{ color: C.dim, alignSelf: "center", fontSize: "18px" }}>→</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: C.accent }}>+18</div>
                  <div style={{ fontSize: "9px", color: C.muted }}>NO SURGERY</div>
                </div>
              </div>
            </div>

            {/* Body stats snapshot */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>Current Body Stats</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Weight",    value: bodyStats.weight + "kg", color: C.accent },
                  { label: "Body Fat",  value: bodyStats.bf + "%",       color: "#E8735A" },
                  { label: "Waist",     value: bodyStats.waist + '"',    color: "#8FA8D8" },
                  { label: "Chest",     value: bodyStats.chest + '"',    color: "#7EC8A9" },
                  { label: "Shoulder",  value: bodyStats.shoulder + '"', color: "#9B8EC4" },
                  { label: "Bicep Flex",value: bodyStats.bicepFlex + '"',color: C.accent },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0C0C0F", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "10px", background: "#0C0C0F", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>Target: 77–78kg @ 12% BF</div>
                <div style={{ height: "4px", background: C.dim, borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, ((72.8 - bodyStats.weight) / (72.8 - 66)) * 100))}%`, background: "#E8735A", borderRadius: "2px" }} />
                </div>
                <div style={{ fontSize: "10px", color: C.muted, marginTop: "4px" }}>
                  {bodyStats.weight > 66 ? `${(bodyStats.weight - 66).toFixed(1)}kg to cut target (67kg)` : "Cut target reached — start lean bulk"}
                </div>
              </div>
            </div>

            {/* Today habit groups quick view */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>Today's Progress by Category</div>
              {HABIT_GROUPS.map(group => {
                const { done: gd, total: gt } = getGroupCompletion(group);
                const gpct = Math.round((gd / gt) * 100);
                return (
                  <div key={group.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ color: group.color, fontSize: "14px", width: "20px", textAlign: "center", flexShrink: 0 }}>{group.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "11px", color: C.text }}>{group.label}</span>
                        <span style={{ fontSize: "10px", color: gd === gt ? "#7EC8A9" : group.color }}>{gd}/{gt}</span>
                      </div>
                      <div style={{ height: "3px", background: C.dim, borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${gpct}%`, background: group.color, borderRadius: "2px", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phase & timeline */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>Transformation Phases</div>
              {[
                { phase: "Phase 1", time: "Month 1–3",  title: "Foundation", items: ["Skincare locked in", "Mini cut started", "Posture work daily", "Beard growing"],               color: "#E8735A" },
                { phase: "Phase 2", time: "Month 3–5",  title: "Build",      items: ["Skin 60–70% cleared", "Jaw emerging", "Italian beard forming", "Adapalene nightly"],           color: "#C8A96E" },
                { phase: "Phase 3", time: "Month 6–12", title: "Peak",       items: ["80kg @ 12% BF", "Skin near-clear", "Full Italian beard", "Face fully sharp"],                  color: "#7EC8A9" },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: p.color + "22", border: `2px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: p.color, flexShrink: 0 }}>{i + 1}</div>
                    {i < 2 && <div style={{ width: "2px", height: "30px", background: `linear-gradient(${p.color}, ${["#C8A96E", "#7EC8A9"][i]})` }} />}
                  </div>
                  <div style={{ paddingBottom: i < 2 ? "16px" : "0", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: C.text }}>{p.title}</span>
                      <span style={{ fontSize: "9px", color: p.color, background: p.color + "18", padding: "2px 7px", borderRadius: "8px" }}>{p.time}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {p.items.map((item, ii) => (
                        <span key={ii} style={{ fontSize: "10px", color: C.muted, background: "#0C0C0F", padding: "2px 6px", borderRadius: "4px" }}>✓ {item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HABITS ── */}
        {nav === "habits" && (
          <div className="page-enter">
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</div>
                <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{done} of {total} habits completed</div>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 900, color: pct === 100 ? "#7EC8A9" : C.accent }}>{pct}%</div>
            </div>

            {HABIT_GROUPS.map(group => {
              const { done: gd, total: gt } = getGroupCompletion(group);
              return (
                <div key={group.id} className="glass-card" style={{ marginBottom: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: group.color, fontSize: "16px" }}>{group.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", flex: 1 }}>{group.label}</span>
                    <span style={{ fontSize: "11px", color: gd === gt ? "#7EC8A9" : group.color, fontWeight: 700 }}>{gd}/{gt}</span>
                  </div>
                  <div style={{ padding: "8px 12px 12px" }}>
                    {group.habits.map(habit => {
                      const isDone = isHabitDone(habit.id);
                      return (
                        <div
                          key={habit.id}
                          className="habit-item"
                          onClick={() => toggleHabit(habit.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "12px 12px", marginBottom: "6px",
                            background: isDone ? group.color + "12" : "#0C0C0F",
                            border: `1px solid ${isDone ? group.color + "44" : C.dim}`,
                            borderRadius: "10px", cursor: "pointer",
                          }}
                        >
                          <div className={`check-box${isDone ? " checked" : ""}`} style={{
                            background: isDone ? group.color : "#1A1A22",
                            border: `1.5px solid ${isDone ? group.color : C.dim}`,
                            color: isDone ? "#0A0A0D" : "transparent",
                          }}>✓</div>
                          <span style={{ fontSize: "13px", flex: 1, color: isDone ? group.color : C.text, textDecoration: isDone ? "line-through" : "none", lineHeight: 1.3 }}>{habit.label}</span>
                          <span className="time-tag" style={{ color: C.muted, background: "#0C0C0F" }}>{habit.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── GYM ── */}
        {nav === "gym" && (
          <div className="page-enter">
            {/* Day selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "12px" }}>
              {GYM_DAYS.map((d, i) => (
                <button key={i} onClick={() => setActiveGymDay(activeGymDay === i ? null : i)} style={{
                  padding: "6px 2px",
                  background: activeGymDay === i ? d.color + "22" : C.surface,
                  border: `1px solid ${activeGymDay === i ? d.color : C.border}`,
                  borderRadius: "8px", cursor: "pointer",
                }}>
                  <div style={{ fontSize: "8px", color: activeGymDay === i ? d.color : C.muted, fontWeight: 700, textAlign: "center" }}>{d.day}</div>
                  <div style={{ fontSize: "7px", color: activeGymDay === i ? d.color : "#444", textAlign: "center", marginTop: "2px" }}>
                    {d.session === "Rest" ? "REST" : d.session.split(" ")[0].toUpperCase()}
                  </div>
                </button>
              ))}
            </div>

            {activeGymDay !== null && (() => {
              const gd = GYM_DAYS[activeGymDay];
              return (
                <div>
                  <div style={{ background: gd.color + "15", border: `1px solid ${gd.color}33`, borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "10px", color: gd.color, fontWeight: 700, marginBottom: "2px", letterSpacing: "1px", textTransform: "uppercase" }}>{gd.day} — {gd.session}</div>
                    <div style={{ fontSize: "12px", color: "#888", fontStyle: "italic" }}>{gd.focus}</div>
                  </div>
                  {gd.exercises.map((ex, ei) => {
                    const key = `${today}_gym_${activeGymDay}_${ei}`;
                    const isDone = !!completedExercises[key];
                    return (
                      <div
                        key={ei}
                        className="habit-item"
                        onClick={() => toggleExercise(key)}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "13px 14px", marginBottom: "6px",
                          background: isDone ? gd.color + "12" : C.surface,
                          border: `1px solid ${isDone ? gd.color + "44" : C.border}`,
                          borderRadius: "12px", cursor: "pointer",
                        }}
                      >
                        <div className={`check-box${isDone ? " checked" : ""}`} style={{
                          background: isDone ? gd.color : "#1A1A22",
                          border: `1.5px solid ${isDone ? gd.color : C.dim}`,
                          color: isDone ? "#0A0A0D" : "transparent",
                        }}>✓</div>
                        <span style={{ fontSize: "13px", color: isDone ? gd.color : C.text, textDecoration: isDone ? "line-through" : "none", flex: 1, lineHeight: 1.3 }}>{ex}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {activeGymDay === null && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                <div style={{ color: C.muted, fontSize: "13px" }}>Select a day above to see the session</div>
              </div>
            )}

            {/* Posture reminder */}
            <div style={{ background: "#8FA8D815", border: "1px solid #8FA8D833", borderRadius: "10px", padding: "12px 14px", marginTop: "10px" }}>
              <div style={{ fontSize: "10px", color: "#8FA8D8", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Daily Posture Work (10 min)</div>
              {["Chin tucks 3×15 (hourly while studying)", "Wall angels 3×10", "Dead hang 3×30s (Pull days at gym)", "Hip flexor stretch 2×45s each", "Glute bridge 3×20"].map((item, i) => (
                <div key={i} style={{ fontSize: "11px", color: "#A8A49C", padding: "3px 0", display: "flex", gap: "6px" }}>
                  <span style={{ color: "#8FA8D8" }}>▸</span>{item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NUTRITION ── */}
        {nav === "nutrition" && (
          <div className="page-enter">
            {/* Phase tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
              {NUTRITION_PHASES.map((p, i) => (
                <button key={p.id} onClick={() => { setActiveNutritionPhase(i); save("nutPhase", i); }} style={{
                  flex: 1, padding: "10px 6px",
                  background: activeNutritionPhase === i ? p.color + "22" : C.surface,
                  border: `1px solid ${activeNutritionPhase === i ? p.color : C.border}`,
                  borderRadius: "10px", cursor: "pointer",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: activeNutritionPhase === i ? p.color : C.muted }}>{p.label}</div>
                  <div style={{ fontSize: "9px", color: "#444", marginTop: "2px" }}>{p.months}</div>
                </button>
              ))}
            </div>

            {/* Phase goal */}
            <div style={{ background: nutPhase.color + "15", border: `1px solid ${nutPhase.color}33`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: nutPhase.color, fontWeight: 700 }}>{nutPhase.goal}</div>
            </div>

            {/* Big calorie */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "9px", color: C.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Daily Calories</div>
              <div style={{ fontSize: "52px", fontWeight: 900, color: nutPhase.color, letterSpacing: "-2px", lineHeight: 1 }}>{nutPhase.cal}</div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>kcal / day</div>
            </div>

            {/* Macros grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              {[
                { label: "Protein", value: nutPhase.p,     unit: "g", color: "#E8735A", max: 200 },
                { label: "Carbs",   value: nutPhase.c,     unit: "g", color: "#7EC8A9", max: 380 },
                { label: "Fats",    value: nutPhase.f,     unit: "g", color: "#8FA8D8", max: 120 },
                { label: "Fiber",   value: nutPhase.fiber, unit: "g", color: "#9B8EC4", max: 50  },
              ].map(m => (
                <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: m.color }}>{m.value}<span style={{ fontSize: "12px", fontWeight: 400 }}>{m.unit}</span></div>
                  <div style={{ fontSize: "9px", color: C.muted, textTransform: "uppercase", marginTop: "2px" }}>{m.label}</div>
                  <div style={{ height: "3px", background: C.dim, borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(m.value / m.max) * 100}%`, background: m.color, borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Water */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#5BB8E8" }}>{nutPhase.water}L</div>
                <div style={{ fontSize: "9px", color: C.muted, textTransform: "uppercase" }}>Water / day</div>
              </div>
              <div style={{ fontSize: "11px", color: C.muted, textAlign: "right" }}>Set 4 alarms<br />if needed</div>
            </div>

            {/* Supplements */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "10px", fontWeight: 600 }}>Daily Supplements</div>
              {[
                { name: "Zinc 50mg",          time: "AM with food", color: "#E8735A", start: "Month 1" },
                { name: "Biotin 5000mcg",     time: "AM",           color: "#7EC8A9", start: "Month 1" },
                { name: "Vitamin D3 2000IU",  time: "AM with fat",  color: "#C8A96E", start: "Month 1" },
                { name: "Creatine 5g",        time: "Any time",     color: "#9B8EC4", start: "Month 4" },
                { name: "Omega-3 1–2g",       time: "With meal",    color: "#8FA8D8", start: "Month 2" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.dim}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{s.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: C.muted }}>{s.time}</div>
                    <div style={{ fontSize: "9px", color: s.color }}>{s.start}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SKINCARE ── */}
        {nav === "skincare" && (
          <div className="page-enter">
            {/* AM/PM toggle */}
            <div style={{ display: "flex", background: "#0C0C0F", borderRadius: "8px", padding: "3px", marginBottom: "12px" }}>
              {([ ["am", "☀ Morning (AM)"], ["pm", "🌙 Evening (PM)"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setActiveSkinTab(id)} style={{
                  flex: 1, padding: "8px", fontSize: "12px", fontWeight: activeSkinTab === id ? 700 : 400,
                  color: activeSkinTab === id ? "#0A0A0D" : C.muted,
                  background: activeSkinTab === id ? "#E8735A" : "none",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>

            {SKINCARE[activeSkinTab as "am" | "pm"].map((step, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#E8735A22", border: "1px solid #E8735A55", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#E8735A", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>{step.step}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#E8735A", marginBottom: "3px", marginLeft: "30px" }}>{step.product}</div>
                <div style={{ fontSize: "11px", color: C.muted, marginLeft: "30px" }}>{step.how}</div>
              </div>
            ))}

            {/* Adapalene schedule */}
            <div style={{ background: "#E8735A15", border: "1px solid #E8735A33", borderRadius: "10px", padding: "14px", marginTop: "4px" }}>
              <div style={{ fontSize: "10px", color: "#E8735A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Adapalene Schedule</div>
              {SKINCARE.adapaleneSchedule.map((s, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#A8A49C", padding: "3px 0", display: "flex", gap: "6px" }}>
                  <span style={{ color: "#E8735A" }}>▸</span>{s}
                </div>
              ))}
              <div style={{ marginTop: "10px", fontSize: "11px", color: C.muted, lineHeight: 1.5 }}>
                ⚠ Never use AHA and Adapalene on the same night
              </div>
            </div>

            {/* Beard care */}
            <div style={{ background: "#7EC8A915", border: "1px solid #7EC8A933", borderRadius: "10px", padding: "14px", marginTop: "8px" }}>
              <div style={{ fontSize: "10px", color: "#7EC8A9", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Beard Growth Protocol</div>
              {[
                "Castor oil massage nightly (2 min)",
                "Derma roller 0.5mm × 2/week → castor oil after",
                "Don't trim for 60–90 days — let it fill in",
                "Minoxidil 5% from Month 4 if needed",
              ].map((s, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#A8A49C", padding: "3px 0", display: "flex", gap: "6px" }}>
                  <span style={{ color: "#7EC8A9" }}>▸</span>{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        {nav === "stats" && (
          <div className="page-enter">
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", fontWeight: 600 }}>Update Body Stats</div>
                {saveMsg && <span style={{ fontSize: "11px", color: "#7EC8A9" }}>{saveMsg}</span>}
              </div>
              {[
                { key: "weight",    label: "Weight (kg)",       step: "0.1"  },
                { key: "bf",        label: "Body Fat (%)",       step: "0.5"  },
                { key: "waist",     label: "Waist (inches)",     step: "0.5"  },
                { key: "chest",     label: "Chest (inches)",     step: "0.5"  },
                { key: "shoulder",  label: "Shoulder (inches)",  step: "0.5"  },
                { key: "bicepFlex", label: "Bicep Flex (inches)",step: "0.25" },
              ].map(({ key, label, step }) => (
                <div key={key} style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>{label}</div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ flex: 1, background: "#0C0C0F", border: `1px solid ${C.dim}`, borderRadius: "6px", padding: "2px" }}>
                      <input
                        type="number"
                        step={step}
                        value={tempStats[key as keyof BodyStats]}
                        onChange={e => setTempStats(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: "100%", background: "none", border: "none", color: C.accent, fontSize: "15px", fontWeight: 700, padding: "6px 10px", outline: "none" }}
                      />
                    </div>
                    <div style={{ fontSize: "11px", color: bodyStats[key as keyof BodyStats] !== tempStats[key as keyof BodyStats] ? "#7EC8A9" : C.muted, minWidth: "60px" }}>
                      {bodyStats[key as keyof BodyStats] !== tempStats[key as keyof BodyStats] ? `was ${bodyStats[key as keyof BodyStats]}` : "no change"}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={saveStats} style={{
                width: "100%", padding: "12px", background: C.accent, border: "none", borderRadius: "8px",
                color: "#0A0A0D", fontSize: "13px", fontWeight: 800, cursor: "pointer", marginTop: "6px",
              }}>Save Stats</button>
            </div>

            {/* Goals reference */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>End Goals</div>
              {[
                { label: "Weight",         current: bodyStats.weight + "kg",  target: "77–78kg",        color: C.accent },
                { label: "Body Fat",       current: bodyStats.bf + "%",        target: "12%",            color: "#E8735A" },
                { label: "Waist",          current: bodyStats.waist + '"',     target: '30–31"',         color: "#8FA8D8" },
                { label: "Aesthetic Score",current: "58/100",                  target: "76/100",         color: "#7EC8A9" },
                { label: "Italian Beard",  current: "Growing",                 target: "Full (Month 4–6)",color: "#B8A06E" },
                { label: "Skin",           current: "Acne present",            target: "Clear (Month 3–4)",color: "#E8735A" },
              ].map((g, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < 5 ? `1px solid ${C.dim}` : "none" }}>
                  <span style={{ fontSize: "12px", color: "#A8A49C" }}>{g.label}</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: C.muted }}>{g.current}</span>
                    <span style={{ color: C.dim, fontSize: "10px" }}>→</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: g.color }}>{g.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {nav === "history" && (
          <HistoryPage
            todaySnapshot={loaded ? {
              date: today,
              completedHabits,
              completedExercises,
              bodyStats: bodyStats as unknown as Record<string, number>,
              habitPct: pct,
            } : null}
          />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div className="bottom-nav app-bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#0F0F14", borderTop: `1px solid ${C.border}`,
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 10,
      }}>
        {NAV.map(item => (
          <button
            key={item.id}
            className="nav-btn"
            onClick={() => setNav(item.id)}
            style={{
              flex: 1, padding: "8px 0 6px",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
            }}
          >
            <span style={{ fontSize: "18px", color: nav === item.id ? C.accent : C.muted, transition: "color 0.15s" }}>{item.icon}</span>
            <span style={{ fontSize: "9px", letterSpacing: "0.5px", color: nav === item.id ? C.accent : C.muted, fontWeight: nav === item.id ? 700 : 400, transition: "color 0.15s" }}>
              {item.label.toUpperCase()}
            </span>
            {nav === item.id && (
              <div style={{ width: "20px", height: "2.5px", background: C.accent, borderRadius: "1.5px", marginTop: "1px" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
