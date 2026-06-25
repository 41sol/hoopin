/* Front-end-only constants not backed by Supabase. */
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
