-- Screen 4 — seed historical evaluations so My Journey's trend has data.
-- One evaluation per player per month for the last 6 months; each evaluation's
-- 4 criterion scores are set to that month's target "overall" (ported from the
-- prototype's per-player trend arrays).
--
-- NOTE: run on an empty evaluations table. (An uncorrelated "not exists" guard
-- inside the data-modifying CTE self-interferes in Postgres, so we don't use one;
-- `e` is MATERIALIZED so the insert + score join see a stable row set.)

with t(number, m, overall) as (values
  (10,0,62),(10,1,65),(10,2,68),(10,3,72),(10,4,77),(10,5,84),
  ( 7,0,70),( 7,1,69),( 7,2,73),( 7,3,75),( 7,4,78),( 7,5,82),
  ( 9,0,58),( 9,1,63),( 9,2,66),( 9,3,64),( 9,4,71),( 9,5,79),
  ( 4,0,72),( 4,1,74),( 4,2,75),( 4,3,78),( 4,4,80),( 4,5,83),
  ( 6,0,60),( 6,1,64),( 6,2,67),( 6,3,70),( 6,4,74),( 6,5,78),
  (11,0,55),(11,1,58),(11,2,57),(11,3,62),(11,4,66),(11,5,70),
  ( 2,0,64),( 2,1,66),( 2,2,68),( 2,3,71),( 2,4,73),( 2,5,76),
  ( 1,0,70),( 1,1,71),( 1,2,73),( 1,3,74),( 1,4,76),( 1,5,79),
  ( 8,0,61),( 8,1,63),( 8,2,67),( 8,3,69),( 8,4,72),( 8,5,77),
  ( 3,0,62),( 3,1,64),( 3,2,66),( 3,3,68),( 3,4,71),( 3,5,74),
  (14,0,52),(14,1,55),(14,2,59),(14,3,60),(14,4,64),(14,5,69),
  ( 5,0,68),( 5,1,70),( 5,2,71),( 5,3,73),( 5,4,75),( 5,5,78)
),
e as materialized (
  select p.id as player_id, p.team_id,
         (date_trunc('month', current_date) - make_interval(months => (5 - t.m)) + interval '4 days')::date as d,
         t.overall
  from t
  join public.players p
    on p.number = t.number
   and p.team_id = (select id from public.teams order by created_at limit 1)
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
