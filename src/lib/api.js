import { supabase } from "./supabase.js";

/* Data access for Screen 1. Each function throws on error so callers can
   surface it; reads are shaped into the structure the UI expects. */

export async function getTeam() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, age_group, sport, auto_apply_eval")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Team preference: auto-apply advanced-evaluation suggestions to squad ratings.
export async function setAutoApplyEval(teamId, value) {
  const { error } = await supabase.from("teams").update({ auto_apply_eval: value }).eq("id", teamId);
  if (error) throw error;
}

export async function getSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("id, key, label, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

const PLAYER_SELECT = `
  id, team_id, name, number, position, line, age, height_cm, weight_kg, foot,
  availability, attendance_pct,
  player_skills ( value, position, skill:skills ( id, key, label, sort_order, line ) )
`;

export async function getPlayers(teamId) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .eq("team_id", teamId)
    .order("number", { ascending: true });
  if (error) throw error;
  return (data || []).map(shapePlayer);
}

// Flattens the nested skills join into both an ordered list and a key→value map.
// Sub-skills are position-specific: we keep only the rows for the player's active
// position (and matching line). Other positions' ratings stay in the table so a
// player keeps their progress when switched back. Legacy generic skills (line=null)
// are ignored.
function shapePlayer(row) {
  const skillList = (row.player_skills || [])
    .filter(ps => ps.skill && ps.skill.line === row.line && ps.position === row.position)
    .map(ps => ({ skillId: ps.skill.id, key: ps.skill.key, label: ps.skill.label, sort: ps.skill.sort_order ?? 0, value: ps.value }))
    .sort((a, b) => a.sort - b.sort);
  const skills = Object.fromEntries(skillList.map(s => [s.key, s.value]));
  const { player_skills, ...rest } = row;
  return { ...rest, skillList, skills };
}

export async function updatePlayer(id, patch) {
  const { data, error } = await supabase
    .from("players")
    .update(patch)
    .eq("id", id)
    .select(PLAYER_SELECT)
    .single();
  if (error) throw error;
  return shapePlayer(data);
}

// Persists changed skill values for a player's given position (upsert on the
// player+position+skill triple).
export async function savePlayerSkills(playerId, position, entries) {
  const rows = entries.map(e => ({ player_id: playerId, position, skill_id: e.skillId, value: e.value }));
  const { error } = await supabase
    .from("player_skills")
    .upsert(rows, { onConflict: "player_id,position,skill_id" });
  if (error) throw error;
}

// Ensures a player has a sub-skill row for every skill of `line` under `position`,
// seeding any missing ones at `seedValue`. Existing rows are left untouched
// (ignoreDuplicates), so switching a player to a former position restores its
// ratings rather than overwriting them.
export async function ensurePositionRatings(playerId, position, line, seedValue) {
  const { data: skills, error } = await supabase.from("skills").select("id").eq("line", line);
  if (error) throw error;
  const rows = (skills || []).map(s => ({ player_id: playerId, position, skill_id: s.id, value: seedValue }));
  if (!rows.length) return;
  const { error: e2 } = await supabase
    .from("player_skills")
    .upsert(rows, { onConflict: "player_id,position,skill_id", ignoreDuplicates: true });
  if (e2) throw e2;
}

/* ---------- Screen 2: Evaluations ---------- */

export async function getEvalCriteria() {
  const { data, error } = await supabase
    .from("eval_criteria")
    .select("id, key, label, icon, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

// Creates an evaluation header then its per-criterion scores (0-100).
// `scores` is [{ criterionId, value }].
export async function createEvaluation({ playerId, teamId, coachName, evalDate, evalType, opponent, note, scores }) {
  const { data: evaluation, error: e1 } = await supabase
    .from("evaluations")
    .insert({
      player_id: playerId,
      team_id: teamId,
      coach_name: coachName,
      eval_date: evalDate,
      eval_type: evalType,
      opponent: opponent || null,
      note: note || null,
    })
    .select("id")
    .single();
  if (e1) throw e1;

  const rows = scores.map(s => ({ evaluation_id: evaluation.id, criterion_id: s.criterionId, value: s.value }));
  const { error: e2 } = await supabase.from("evaluation_scores").insert(rows);
  if (e2) throw e2;
  return evaluation.id;
}

// Records an advanced technical evaluation (per position sub-skill) and its
// per-skill suggestion + outcome. `scores` is
// [{ skillId, stars, prevValue, suggestedDelta, appliedValue }].
export async function createSkillEvaluation({ playerId, teamId, position, coachName, evalDate, applied, scores }) {
  const { data: evaluation, error: e1 } = await supabase
    .from("skill_evaluations")
    .insert({
      player_id: playerId,
      team_id: teamId,
      position,
      coach_name: coachName,
      eval_date: evalDate,
      applied: !!applied,
      applied_at: applied ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (e1) throw e1;

  const rows = scores.map(s => ({
    skill_evaluation_id: evaluation.id,
    skill_id: s.skillId,
    stars: s.stars,
    prev_value: s.prevValue,
    suggested_delta: s.suggestedDelta,
    applied_value: s.appliedValue ?? null,
  }));
  const { error: e2 } = await supabase.from("skill_evaluation_scores").insert(rows);
  if (e2) throw e2;
  return evaluation.id;
}

/* ---------- Screen 2: Attendance (US-4) ---------- */

// Recorded attendance for a session (team + date + type), as { playerId: status }.
export async function getAttendance(teamId, sessionDate, sessionType) {
  const { data, error } = await supabase
    .from("attendance")
    .select("player_id, status")
    .eq("team_id", teamId)
    .eq("session_date", sessionDate)
    .eq("session_type", sessionType);
  if (error) throw error;
  return Object.fromEntries((data || []).map(r => [r.player_id, r.status]));
}

// Recent attendance rows for one player (newest first) for the profile log.
export async function getPlayerAttendance(playerId, limit = 8) {
  const { data, error } = await supabase
    .from("attendance")
    .select("session_date, session_type, status")
    .eq("player_id", playerId)
    .order("session_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Sets (or clears, when status is null) one player's attendance for a session.
export async function setAttendance(teamId, playerId, sessionDate, sessionType, status) {
  if (status == null) {
    const { error } = await supabase.from("attendance")
      .delete()
      .eq("team_id", teamId).eq("player_id", playerId)
      .eq("session_date", sessionDate).eq("session_type", sessionType);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("attendance")
      .upsert({ team_id: teamId, player_id: playerId, session_date: sessionDate, session_type: sessionType, status, updated_at: new Date().toISOString() },
              { onConflict: "team_id,player_id,session_date,session_type" });
    if (error) throw error;
  }
}

/* ---------- Screen 3: Lineups ---------- */

export async function getFormations() {
  const { data, error } = await supabase
    .from("formations")
    .select("id, name, sort_order, slots")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

// Saved lineups for a team (newest first) for the load picker.
export async function getLineups(teamId) {
  const { data, error } = await supabase
    .from("lineups")
    .select("id, name, match_date, opponent, created_at, formation:formations(id, name)")
    .eq("team_id", teamId)
    .order("match_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Full lineup with its slot assignments as { slot_index: player_id }.
export async function getLineupDetail(id) {
  const { data, error } = await supabase
    .from("lineups")
    .select("id, name, match_date, opponent, formation:formations(id, name, slots), lineup_slots(slot_index, player_id)")
    .eq("id", id)
    .single();
  if (error) throw error;
  const assign = {};
  (data.lineup_slots || []).forEach(s => { if (s.player_id != null) assign[s.slot_index] = s.player_id; });
  return { ...data, assign };
}

// Insert (or update existing) a lineup + its slots. `assign` is { slotIndex: playerId }.
export async function saveLineup({ id, teamId, formationId, name, matchDate, opponent, assign }) {
  let lineupId = id;
  const header = {
    team_id: teamId, formation_id: formationId, name: name || null,
    match_date: matchDate || null, opponent: opponent || null,
  };

  if (lineupId) {
    const { error } = await supabase.from("lineups").update(header).eq("id", lineupId);
    if (error) throw error;
    const { error: delErr } = await supabase.from("lineup_slots").delete().eq("lineup_id", lineupId);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase.from("lineups").insert(header).select("id").single();
    if (error) throw error;
    lineupId = data.id;
  }

  const rows = Object.entries(assign)
    .filter(([, playerId]) => playerId != null)
    .map(([slotIndex, playerId]) => ({ lineup_id: lineupId, slot_index: Number(slotIndex), player_id: playerId }));
  if (rows.length) {
    const { error } = await supabase.from("lineup_slots").insert(rows);
    if (error) throw error;
  }
  return lineupId;
}

/* ---------- Screen 4: My Journey ---------- */

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Monthly "overall" trend for a player: each evaluation's overall = avg of its
// criterion scores; months are then averaged and returned oldest → newest.
export async function getPlayerTrend(playerId) {
  const { data, error } = await supabase
    .from("evaluations")
    .select("eval_date, evaluation_scores(value)")
    .eq("player_id", playerId)
    .order("eval_date", { ascending: true });
  if (error) throw error;

  const buckets = new Map(); // 'YYYY-MM' -> { sum, n, label }
  for (const ev of data || []) {
    const scores = (ev.evaluation_scores || []).map(s => s.value);
    if (!scores.length) continue;
    const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
    const d = new Date(ev.eval_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key) || { sum: 0, n: 0, label: MONTH_LABELS[d.getMonth()] };
    b.sum += overall; b.n += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, b]) => ({ key, label: b.label, value: Math.round(b.sum / b.n) }));
}

/* ---------- Screen 5: Announcement & RSVP Board ---------- */

const ANN_SELECT = `
  id, author_name, author_role, tag, tag_color, title, body, pinned, has_rsvp, deadline, created_at,
  announcement_rsvps ( player_id, status )
`;

export async function getAnnouncements(teamId) {
  const { data, error } = await supabase
    .from("announcements")
    .select(ANN_SELECT)
    .eq("team_id", teamId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(shapeAnnouncement);
}

// Builds the tally and exposes the raw rsvps so the caller can read "my" status.
function shapeAnnouncement(row) {
  const rsvps = row.announcement_rsvps || [];
  const tally = { in: 0, maybe: 0, out: 0 };
  for (const r of rsvps) if (tally[r.status] != null) tally[r.status] += 1;
  const { announcement_rsvps, ...rest } = row;
  return { ...rest, rsvps, tally };
}

export async function createAnnouncement(payload) {
  const { data, error } = await supabase.from("announcements").insert(payload).select(ANN_SELECT).single();
  if (error) throw error;
  return shapeAnnouncement(data);
}

export async function updateAnnouncement(id, payload) {
  const { data, error } = await supabase.from("announcements").update(payload).eq("id", id).select(ANN_SELECT).single();
  if (error) throw error;
  return shapeAnnouncement(data);
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// Sets (or clears, when status is null) one player's RSVP, then returns the
// refreshed announcement so the tally stays in sync.
export async function setRsvp(announcementId, playerId, status) {
  if (status == null) {
    const { error } = await supabase.from("announcement_rsvps")
      .delete().eq("announcement_id", announcementId).eq("player_id", playerId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("announcement_rsvps")
      .upsert({ announcement_id: announcementId, player_id: playerId, status, updated_at: new Date().toISOString() },
              { onConflict: "announcement_id,player_id" });
    if (error) throw error;
  }
  const { data, error } = await supabase.from("announcements").select(ANN_SELECT).eq("id", announcementId).single();
  if (error) throw error;
  return shapeAnnouncement(data);
}
