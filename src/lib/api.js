import { supabase } from "./supabase.js";

/* Data access for Screen 1. Each function throws on error so callers can
   surface it; reads are shaped into the structure the UI expects. */

export async function getTeam() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, age_group, sport")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("id, key, label, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getPlayers(teamId) {
  const { data, error } = await supabase
    .from("players")
    .select(`
      id, team_id, name, number, position, line, age, height_cm, weight_kg, foot,
      availability, attendance_pct,
      player_skills ( value, skill:skills ( id, key, label, sort_order ) )
    `)
    .eq("team_id", teamId)
    .order("number", { ascending: true });
  if (error) throw error;
  return (data || []).map(shapePlayer);
}

// Flattens the nested skills join into both an ordered list and a key→value map.
function shapePlayer(row) {
  const skillList = (row.player_skills || [])
    .filter(ps => ps.skill)
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
    .select(`
      id, team_id, name, number, position, line, age, height_cm, weight_kg, foot,
      availability, attendance_pct,
      player_skills ( value, skill:skills ( id, key, label, sort_order ) )
    `)
    .single();
  if (error) throw error;
  return shapePlayer(data);
}

// Persists changed skill values immediately (upsert on the player+skill pair).
export async function savePlayerSkills(playerId, entries) {
  const rows = entries.map(e => ({ player_id: playerId, skill_id: e.skillId, value: e.value }));
  const { error } = await supabase
    .from("player_skills")
    .upsert(rows, { onConflict: "player_id,skill_id" });
  if (error) throw error;
}
