-- Additional dummy players (numbers 12, 13, 15–22; no conflict with 0002 seed).
-- Idempotent: safe to re-run.

insert into public.players
  (team_id, name, number, position, line, age, height_cm, weight_kg, foot, availability, attendance_pct)
select t.id, v.name, v.number, v.position, v.line, v.age, v.height_cm, v.weight_kg, v.foot, v.availability, v.attendance_pct
from (select id from public.teams order by created_at limit 1) t,
(values
  ('Fadi Assaf',      12, 'CB',  'DEF', 15, 180, 70, 'Right', 'in',    0.89),
  ('Charbel Nader',   13, 'CM',  'MID', 16, 173, 63, 'Right', 'in',    0.92),
  ('Georges Frem',    15, 'RW',  'FWD', 14, 168, 57, 'Right', 'maybe', 0.76),
  ('Youssef Hajj',    16, 'LW',  'FWD', 15, 169, 59, 'Left',  'in',    0.87),
  ('Patrick Abi',     17, 'RB',  'DEF', 16, 175, 67, 'Right', 'in',    0.91),
  ('Ramzi Khoury',    18, 'LB',  'DEF', 15, 171, 62, 'Left',  'in',    0.84),
  ('Elias Bou Saab',  19, 'GK',  'GK',  16, 187, 78, 'Right', 'in',    0.96),
  ('Anthony Gemayel', 20, 'CAM', 'MID', 14, 166, 55, 'Right', 'out',   0.68),
  ('Hassan Mroueh',   21, 'CDM', 'MID', 15, 174, 65, 'Right', 'maybe', 0.80),
  ('Dani Tawk',       22, 'ST',  'FWD', 16, 179, 69, 'Right', 'in',    0.93)
) as v(name, number, position, line, age, height_cm, weight_kg, foot, availability, attendance_pct)
where not exists (select 1 from public.players p where p.name = v.name);

-- Player skills for the new players
insert into public.player_skills (player_id, skill_id, value, position)
select p.id, s.id, v.value, p.position
from (values
  (12,'passing',74),(12,'shooting',51),(12,'dribbling',60),(12,'stamina',85),
  (13,'passing',83),(13,'shooting',63),(13,'dribbling',76),(13,'stamina',82),
  (15,'passing',72),(15,'shooting',80),(15,'dribbling',84),(15,'stamina',74),
  (16,'passing',75),(16,'shooting',77),(16,'dribbling',87),(16,'stamina',76),
  (17,'passing',76),(17,'shooting',54),(17,'dribbling',69),(17,'stamina',89),
  (18,'passing',71),(18,'shooting',49),(18,'dribbling',64),(18,'stamina',86),
  (19,'passing',65),(19,'shooting',38),(19,'dribbling',47),(19,'stamina',82),
  (20,'passing',82),(20,'shooting',70),(20,'dribbling',88),(20,'stamina',71),
  (21,'passing',81),(21,'shooting',58),(21,'dribbling',70),(21,'stamina',91),
  (22,'passing',69),(22,'shooting',89),(22,'dribbling',78),(22,'stamina',75)
) as v(number, skill_key, value)
join public.players p
  on p.number = v.number
 and p.team_id = (select id from public.teams order by created_at limit 1)
join public.skills s on s.key = v.skill_key
on conflict (player_id, skill_id) do nothing;

-- Historical evaluations (6 months) so each new player has an overall rating trend
with t(number, m, overall) as (values
  (12,0,65),(12,1,67),(12,2,70),(12,3,72),(12,4,74),(12,5,76),
  (13,0,68),(13,1,70),(13,2,72),(13,3,75),(13,4,77),(13,5,80),
  (15,0,60),(15,1,63),(15,2,66),(15,3,69),(15,4,72),(15,5,75),
  (16,0,62),(16,1,65),(16,2,67),(16,3,70),(16,4,73),(16,5,76),
  (17,0,63),(17,1,65),(17,2,68),(17,3,70),(17,4,72),(17,5,75),
  (18,0,61),(18,1,63),(18,2,65),(18,3,68),(18,4,70),(18,5,73),
  (19,0,70),(19,1,71),(19,2,73),(19,3,75),(19,4,77),(19,5,79),
  (20,0,58),(20,1,61),(20,2,64),(20,3,67),(20,4,70),(20,5,73),
  (21,0,66),(21,1,68),(21,2,71),(21,3,73),(21,4,76),(21,5,79),
  (22,0,64),(22,1,67),(22,2,70),(22,3,73),(22,4,76),(22,5,80)
),
e as materialized (
  select p.id as player_id, p.team_id,
         (date_trunc('month', current_date) - make_interval(months => (5 - t.m)) + interval '4 days')::date as d,
         t.overall
  from t
  join public.players p
    on p.number = t.number
   and p.team_id = (select id from public.teams order by created_at limit 1)
  where not exists (
    select 1 from public.evaluations ev
    where ev.player_id = p.id
  )
),
ins as (
  insert into public.evaluations (player_id, team_id, coach_name, eval_date, eval_type)
  select player_id, team_id, 'Coach Walid', d, 'training' from e
  returning id, player_id, eval_date
)
insert into public.evaluation_scores (evaluation_id, criterion_id, value)
select ins.id, c.id, e.overall
from ins
join e on e.player_id = ins.player_id and e.d = ins.eval_date
cross join public.eval_criteria c;
