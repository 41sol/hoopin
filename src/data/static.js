/* Front-end-only illustrative data not yet backed by Supabase.
   The per-player attendance log is intentionally dummy for Screen 1 — real
   attendance records arrive with Screen 3 (Lineup & Attendance Tracker). */
export const ATTENDANCE_LOG = [
  { date: "Jun 18", type: "Training", status: "present" },
  { date: "Jun 15", type: "Match · vs Sagesse", status: "present" },
  { date: "Jun 13", type: "Training", status: "present" },
  { date: "Jun 11", type: "Training", status: "late" },
  { date: "Jun 8", type: "Match · vs Homenetmen", status: "absent" },
  { date: "Jun 6", type: "Training", status: "present" },
  { date: "Jun 4", type: "Training", status: "present" },
];

export const LINES = ["GK", "DEF", "MID", "FWD"];
export const LINE_LABEL = { GK: "Goalkeeper", DEF: "Defenders", MID: "Midfielders", FWD: "Forwards" };
export const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"];
// Maps a chosen position back to its pitch line, so editing position keeps grouping correct.
export const POSITION_LINE = {
  GK: "GK", CB: "DEF", LB: "DEF", RB: "DEF",
  CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID",
  LW: "FWD", RW: "FWD", ST: "FWD",
};
export const FEET = ["Right", "Left"];
