-- Seed for Screen 1, ported from the prototype's hardcoded PLAYERS/SKILLS.
-- Idempotent: safe to re-run. Natural keys: team has one row; player.number is
-- unique within the squad; skill.key is unique.

-- Team
insert into public.teams (name, age_group, sport)
select 'Beirut Strikers', 'U16', 'football'
where not exists (select 1 from public.teams);

-- Skills (football)
insert into public.skills (key, label, sport, sort_order) values
  ('passing',   'Passing',   'football', 1),
  ('shooting',  'Shooting',  'football', 2),
  ('dribbling', 'Dribbling', 'football', 3),
  ('stamina',   'Stamina',   'football', 4)
on conflict (key) do nothing;

-- Players
insert into public.players
  (team_id, name, number, position, line, age, height_cm, weight_kg, foot, availability, attendance_pct)
select t.id, v.name, v.number, v.position, v.line, v.age, v.height_cm, v.weight_kg, v.foot, v.availability, v.attendance_pct
from (select id from public.teams order by created_at limit 1) t,
(values
  ('Karim Haddad',  10, 'CAM', 'MID', 15, 172, 61, 'Right', 'in',    0.94),
  ('Rami Khalil',    7, 'RW',  'FWD', 16, 176, 66, 'Left',  'in',    0.88),
  ('Jad Mansour',    9, 'ST',  'FWD', 15, 178, 68, 'Right', 'maybe', 0.79),
  ('Elie Saad',      4, 'CB',  'DEF', 16, 183, 73, 'Right', 'in',    0.97),
  ('Nour Fares',     6, 'CDM', 'MID', 15, 170, 60, 'Right', 'in',    0.91),
  ('Tarek Aoun',    11, 'LW',  'FWD', 14, 165, 54, 'Left',  'out',   0.66),
  ('Sami Rizk',      2, 'RB',  'DEF', 16, 174, 64, 'Right', 'in',    0.85),
  ('Ziad Daher',     1, 'GK',  'GK',  16, 185, 75, 'Right', 'in',    0.93),
  ('Marwan Issa',    8, 'CM',  'MID', 15, 171, 62, 'Right', 'maybe', 0.82),
  ('Hadi Najjar',    3, 'LB',  'DEF', 15, 169, 58, 'Left',  'in',    0.90),
  ('Bassel Kassem', 14, 'ST',  'FWD', 14, 167, 56, 'Right', 'out',   0.70),
  ('Omar Sleiman',   5, 'CB',  'DEF', 16, 181, 71, 'Right', 'in',    0.95)
) as v(name, number, position, line, age, height_cm, weight_kg, foot, availability, attendance_pct)
where not exists (select 1 from public.players p where p.name = v.name);

-- Player skills
insert into public.player_skills (player_id, skill_id, value)
select p.id, s.id, v.value
from (values
  (10,'passing',88),(10,'shooting',74),(10,'dribbling',91),(10,'stamina',79),
  ( 7,'passing',79),( 7,'shooting',85),( 7,'dribbling',88),( 7,'stamina',83),
  ( 9,'passing',71),( 9,'shooting',92),( 9,'dribbling',80),( 9,'stamina',77),
  ( 4,'passing',75),( 4,'shooting',52),( 4,'dribbling',61),( 4,'stamina',86),
  ( 6,'passing',84),( 6,'shooting',60),( 6,'dribbling',72),( 6,'stamina',90),
  (11,'passing',70),(11,'shooting',78),(11,'dribbling',86),(11,'stamina',75),
  ( 2,'passing',77),( 2,'shooting',55),( 2,'dribbling',70),( 2,'stamina',88),
  ( 1,'passing',68),( 1,'shooting',40),( 1,'dribbling',50),( 1,'stamina',80),
  ( 8,'passing',86),( 8,'shooting',66),( 8,'dribbling',78),( 8,'stamina',84),
  ( 3,'passing',73),( 3,'shooting',50),( 3,'dribbling',66),( 3,'stamina',87),
  (14,'passing',66),(14,'shooting',81),(14,'dribbling',75),(14,'stamina',72),
  ( 5,'passing',72),( 5,'shooting',48),( 5,'dribbling',58),( 5,'stamina',85)
) as v(number, skill_key, value)
join public.players p
  on p.number = v.number
 and p.team_id = (select id from public.teams order by created_at limit 1)
join public.skills s on s.key = v.skill_key
on conflict (player_id, skill_id) do nothing;
