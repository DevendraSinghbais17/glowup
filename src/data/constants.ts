// ─── DAILY HABITS ────────────────────────────────────────────────────────────
export const HABIT_GROUPS = [
  {
    id: "skincare", label: "Skincare", icon: "✦", color: "#E8735A",
    habits: [
      { id: "am_cleanser", label: "AM Cleanser (Salicylic 2%)", time: "AM" },
      { id: "am_niacinamide", label: "AM Niacinamide 10%", time: "AM" },
      { id: "am_vitc", label: "AM Vitamin C (Month 2+)", time: "AM" },
      { id: "am_moisturiser", label: "AM Moisturiser", time: "AM" },
      { id: "am_spf", label: "SPF 50 PA++++", time: "AM" },
      { id: "pm_cleanser", label: "PM Double Cleanse", time: "PM" },
      { id: "pm_adapalene", label: "PM Adapalene 0.1%", time: "PM" },
      { id: "pm_moisturiser", label: "PM Moisturiser", time: "PM" },
      { id: "pm_bpo", label: "BPO Spot Treatment", time: "PM" },
    ],
  },
  {
    id: "face", label: "Face & Jaw", icon: "◬", color: "#8FA8D8",
    habits: [
      { id: "mewing", label: "Mewing all day (tongue on palate)", time: "ALL DAY" },
      { id: "chewing", label: "Hard chewing 20–30 min (Falim/carrots)", time: "EVE" },
      { id: "chin_tuck", label: "Chin tucks 3×15", time: "ANY" },
      { id: "wall_angels", label: "Wall angels 3×10", time: "ANY" },
      { id: "hip_flexor", label: "Hip flexor stretch 2×45s", time: "ANY" },
      { id: "glute_bridge", label: "Glute bridge 3×20", time: "ANY" },
      { id: "dead_hang", label: "Dead hang 3×30s (Pull days)", time: "GYM" },
    ],
  },
  {
    id: "beard", label: "Beard & Hair", icon: "◈", color: "#7EC8A9",
    habits: [
      { id: "castor_oil", label: "Castor oil massage (beard area)", time: "PM" },
      { id: "derma_roller", label: "Derma roller 0.5mm (2×/week)", time: "EVE" },
      { id: "hair_oil", label: "Hair — air dry + matte clay", time: "AM" },
    ],
  },
  {
    id: "nutrition", label: "Nutrition", icon: "◉", color: "#C8A96E",
    habits: [
      { id: "protein_hit", label: "Hit protein target", time: "ALL DAY" },
      { id: "water_4l", label: "4L water", time: "ALL DAY" },
      { id: "no_dairy_milk", label: "No liquid dairy milk", time: "ALL DAY" },
      { id: "supplements", label: "Zinc + Biotin + D3 with breakfast", time: "AM" },
    ],
  },
  {
    id: "body", label: "Body & Sleep", icon: "◎", color: "#9B8EC4",
    habits: [
      { id: "gym", label: "Gym session (4–6×/week)", time: "GYM" },
      { id: "walk", label: "30-min brisk walk", time: "EVE" },
      { id: "sleep_time", label: "Sleep by 10:30 PM", time: "NIGHT" },
      { id: "no_phone", label: "No phone 30 min before sleep", time: "NIGHT" },
      { id: "morning_water", label: "500ml water on wake", time: "AM" },
    ],
  },
  {
    id: "grooming", label: "Grooming", icon: "◆", color: "#B8A06E",
    habits: [
      { id: "oral", label: "Brush × 2 + tongue scrape AM", time: "AM/PM" },
      { id: "nails", label: "Nails checked (weekly)", time: "WEEKLY" },
      { id: "fragrance", label: "Fragrance (going out)", time: "OUT" },
    ],
  },
];

// ─── NUTRITION PHASES ─────────────────────────────────────────────────────────
export const NUTRITION_PHASES = [
  { id: "cut",      label: "Mini Cut",   months: "M1–3",   color: "#E8735A", goal: "72.8 → 67kg @ 15% BF",  cal: 1950, p: 160, c: 190, f: 60, fiber: 30, water: 4 },
  { id: "bulk",     label: "Lean Bulk",  months: "M4–15",  color: "#7EC8A9", goal: "67 → 78kg @ 14–15% BF", cal: 2550, p: 165, c: 310, f: 80, fiber: 35, water: 4 },
  { id: "finalcut", label: "Final Cut",  months: "M16–18", color: "#C8A96E", goal: "78 → 77–78kg @ 12% BF", cal: 2000, p: 170, c: 200, f: 60, fiber: 30, water: 4 },
];

// ─── GYM SCHEDULE ─────────────────────────────────────────────────────────────
export const GYM_DAYS = [
  { day: "MON", session: "Push 1", focus: "Chest emphasis", color: "#E8735A",
    exercises: ["Flat Barbell Bench Press 4×5–8", "Incline DB Press 3×8–12", "OHP 3×8–10", "Pec Deck 3×12–15", "Cable Lateral Raise 4×12–15", "Parallel Bar Dips 3×8–12", "Triceps Rope Pushdown 3×12–15", "DB Overhead Triceps Ext 3×10–15", "Cable Crunches 3×15–20", "Parallel Bar Leg Raises 3×10–15"] },
  { day: "TUE", session: "Pull 1", focus: "Back thickness", color: "#7EC8A9",
    exercises: ["Conventional Deadlift 3×4–6", "T-Bar Row 3×6–10", "Lat Pulldown Wide 4×8–12", "Seated Cable Row V-Grip 3×8–12", "Straight-Arm Pulldown 3×12–15", "Face Pull 3×15–20", "Rear Delt Fly 3×12–15", "Barbell Curl 3×8–12", "Preacher Curl 3×10–15", "Barbell Shrug 4×12–15", "DB Shrug 3×15–20", "Plank 3×45–60s"] },
  { day: "WED", session: "Legs 1", focus: "Quad emphasis", color: "#C8A96E",
    exercises: ["Barbell Squat 4×5–8", "Romanian Deadlift 3×8–12", "Leg Press High Foot 3×10–15", "Leg Press Low Foot 2×12–15", "Leg Extension 3×12–15", "Standing Calf Raise 4×12–20", "Seated Calf Raise 3×12–20"] },
  { day: "THU", session: "Push 2", focus: "Shoulder emphasis", color: "#E8735A",
    exercises: ["Standing OHP 4×5–8", "Incline Barbell Press 3×8–12", "DB Lateral Raise 4×15–20", "Cable Lateral Raise 3×12–15", "Machine Chest Fly 3×12–15", "Seated Dip Machine 3×10–15", "Triceps Rope Pushdown 3×12–15", "DB Overhead Triceps Ext 2×12–15", "Decline Crunch 3×12–15", "Parallel Bar Leg Raises 3×10–15"] },
  { day: "FRI", session: "Pull 2", focus: "Width + arms", color: "#7EC8A9",
    exercises: ["Weighted Pull-Up 4×5–10", "Lat Pulldown Neutral 3×10–12", "T-Bar Row 3×8–12", "Straight-Arm Pulldown 3×12–15", "Back Extension 3×12–15", "Face Pull 3×15–20", "Incline DB Rear Delt Fly 3×15–20", "Incline DB Curl 3×10–15", "Hammer Curl 3×10–15", "Cable Curl 2×12–15", "Smith Machine Shrug 4×12–15", "Plank 3×60s"] },
  { day: "SAT", session: "Legs 2", focus: "Posterior chain", color: "#C8A96E",
    exercises: ["Romanian Deadlift 4×6–10", "Leg Press High+Wide 3×10–15", "Lying Leg Curl 4×10–15", "Leg Press Close+Low 3×12–15", "Standing Calf Raise 4×15–20", "Seated Calf Raise 3×15–20"] },
  { day: "SUN", session: "Rest", focus: "Walk + stretch", color: "#444444",
    exercises: ["30-min brisk walk", "Posture exercises", "Hip flexor stretch", "Sleep 7 hours"] },
];

// ─── SKINCARE ─────────────────────────────────────────────────────────────────
export const SKINCARE = {
  am: [
    { step: "Cleanser",    product: "The Derma Co 2% Salicylic Acid Face Wash",       how: "30–60 sec massage, lukewarm rinse" },
    { step: "Niacinamide", product: "BEETL Niacinamide 10% Serum",                    how: "2–3 drops on damp skin, pat in" },
    { step: "Vitamin C",   product: "Minimalist Vitamin C 10% (Month 2+)",            how: "After niacinamide, wait 5 min" },
    { step: "Moisturiser", product: "Simple Hydrating Light Moisturiser",             how: "Pea-sized amount" },
    { step: "SPF",         product: "The Derma Co SPF 50 PA++++ Sunscreen Gel",       how: "2-finger amount, face + neck" },
  ],
  pm: [
    { step: "Double Cleanse", product: "Micellar water → Salicylic face wash",        how: "Remove sweat/SPF first, then cleanse" },
    { step: "Wait",           product: "—",                                            how: "5–10 min until skin fully dry" },
    { step: "Adapalene",      product: "Acnerem Gel 0.1%",                            how: "Pea-sized, whole face. Avoid eyes/lips/nose corners" },
    { step: "Wait",           product: "—",                                            how: "5 min" },
    { step: "Moisturiser",    product: "Simple Hydrating Light Moisturiser",          how: "Thin layer" },
    { step: "Spot",           product: "Benzoyl Peroxide 2.5%",                       how: "Active pimples ONLY" },
  ],
  adapaleneSchedule: [
    "Week 1–2: Mon/Wed/Fri",
    "Week 3–4: Add Saturday",
    "Month 2+: Every night",
  ],
};

// ─── SCORES ──────────────────────────────────────────────────────────────────
export const INITIAL_SCORES  = { bone: 62, skin: 44, hair: 68, eyes: 58 };
export const POTENTIAL_SCORES = { bone: 75, skin: 78, hair: 82, eyes: 68 };

// ─── BODY STATS BASELINE ──────────────────────────────────────────────────────
export const BODY_BASELINE = {
  weight: 72.8,
  bf: 23,
  waist: 34,
  chest: 36,
  shoulder: 20,
  bicepFlex: 13,
};

export type BodyStats = typeof BODY_BASELINE;
