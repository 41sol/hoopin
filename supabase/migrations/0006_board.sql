-- Screen 5 — Announcement & RSVP Board.
-- Announcements (full CRUD) + per-respondent RSVPs. Tallies are computed from
-- real rows; the squad's responses are seeded so the board looks populated.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_name text not null,
  author_role text,
  tag text,
  tag_color text not null default 'muted' check (tag_color in ('brand','accent','blue','green','muted')),
  title text not null,
  body text,
  pinned boolean not null default false,
  has_rsvp boolean not null default true,
  deadline text,
  created_at timestamptz not null default now()
);
create index if not exists announcements_team_idx on public.announcements(team_id);

create table if not exists public.announcement_rsvps (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('in','maybe','out')),
  updated_at timestamptz not null default now(),
  unique (announcement_id, player_id)
);
create index if not exists announcement_rsvps_ann_idx on public.announcement_rsvps(announcement_id);

-- RLS: enabled, DEMO-OPEN for the anon key (Phase 2 -> RBAC).
alter table public.announcements enable row level security;
alter table public.announcement_rsvps enable row level security;
create policy "demo_all_announcements" on public.announcements for all using (true) with check (true);
create policy "demo_all_announcement_rsvps" on public.announcement_rsvps for all using (true) with check (true);

-- Seed the 3 prototype announcements (only if none exist yet).
insert into public.announcements (team_id, author_name, author_role, tag, tag_color, title, body, pinned, has_rsvp, deadline, created_at)
select t.id, v.author_name, v.author_role, v.tag, v.tag_color, v.title, v.body, v.pinned, v.has_rsvp, v.deadline,
       now() - v.age::interval
from (select id from public.teams order by created_at limit 1) t,
(values
  ('Coach Walid',   'Head Coach', 'Match call-up', 'accent', 'Match call-up — Sat 10:00 vs Sagesse',
   'Squad for Saturday''s league match is up. Meet at the academy by 9:00 sharp for warm-up. Bring both kits (home + away). Parents — kickoff is 10:00 at Bourj Hammoud pitch.',
   true,  true,  'RSVP by Fri 18:00', '2 hours'),
  ('Academy Office','Director',   'Schedule',      'blue',   'Tuesday session moved to 17:30',
   'Due to pitch maintenance, this Tuesday''s U16 training is pushed to 17:30–19:00. Same location.',
   false, true,  'RSVP by Mon 20:00', '1 day'),
  ('Coach Walid',   'Head Coach', 'Reminder',      'muted',  'Bring your medical forms',
   'Reminder for new players: hand in signed medical clearance forms before next session. Ask the office if you need a copy.',
   false, false, null,                '2 days')
) as v(author_name, author_role, tag, tag_color, title, body, pinned, has_rsvp, deadline, age)
where not exists (select 1 from public.announcements);

-- Seed squad RSVPs for the two announcements that take responses.
-- Persona "me" = player #10 (Karim): no response to the match call-up (mine = null),
-- and "in" for the schedule change (mine = in), matching the prototype.
insert into public.announcement_rsvps (announcement_id, player_id, status)
select a.id, p.id, v.status
from (values
  -- Match call-up (excludes #10 so the persona has no response yet)
  ('Match call-up — Sat 10:00 vs Sagesse', 1,'in'),('Match call-up — Sat 10:00 vs Sagesse', 7,'in'),
  ('Match call-up — Sat 10:00 vs Sagesse', 9,'in'),('Match call-up — Sat 10:00 vs Sagesse', 4,'in'),
  ('Match call-up — Sat 10:00 vs Sagesse', 6,'in'),('Match call-up — Sat 10:00 vs Sagesse', 2,'in'),
  ('Match call-up — Sat 10:00 vs Sagesse', 8,'in'),('Match call-up — Sat 10:00 vs Sagesse', 3,'in'),
  ('Match call-up — Sat 10:00 vs Sagesse', 5,'maybe'),('Match call-up — Sat 10:00 vs Sagesse',11,'maybe'),
  ('Match call-up — Sat 10:00 vs Sagesse',14,'out'),
  -- Schedule change (includes #10 = in)
  ('Tuesday session moved to 17:30',10,'in'),('Tuesday session moved to 17:30', 1,'in'),
  ('Tuesday session moved to 17:30', 7,'in'),('Tuesday session moved to 17:30', 4,'in'),
  ('Tuesday session moved to 17:30', 6,'in'),('Tuesday session moved to 17:30', 2,'in'),
  ('Tuesday session moved to 17:30', 8,'in'),('Tuesday session moved to 17:30', 3,'in'),
  ('Tuesday session moved to 17:30', 9,'maybe'),('Tuesday session moved to 17:30', 5,'maybe'),
  ('Tuesday session moved to 17:30',11,'maybe'),('Tuesday session moved to 17:30',14,'out')
) as v(title, number, status)
join public.announcements a on a.title = v.title
join public.players p on p.number = v.number
  and p.team_id = (select id from public.teams order by created_at limit 1)
where not exists (select 1 from public.announcement_rsvps)
on conflict (announcement_id, player_id) do nothing;
