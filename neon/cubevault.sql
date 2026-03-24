create table if not exists public.cubevault_solves (
  user_id text not null,
  id text not null,
  time integer not null check (time >= 0),
  scramble text not null,
  recorded_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  penalty text null check (penalty in ('+2', 'DNF')),
  recommended_solution jsonb null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create index if not exists cubevault_solves_user_recorded_at_idx
  on public.cubevault_solves (user_id, recorded_at desc);
