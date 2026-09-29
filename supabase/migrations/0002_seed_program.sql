-- =============================================================================
-- 60dayfit — walking program template
-- =============================================================================
-- Idempotent: safe to re-run.
--
-- Shape of the plan
--   * Six training days a week, the seventh is an easy walk and the weekly
--     weigh-in / photo checkpoint.
--   * The walk grows by 150 m every training session: 3.0 km on day 1 up to
--     10.7 km on day 60.
--   * Week 1 is walking only. From week 2 a squat + push-up round is added
--     before the walk (activation) and after it (finisher); the sets grow every
--     three weeks and the reps every week.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Strength library
-- -----------------------------------------------------------------------------
insert into public.exercises (slug, name, muscle_group, instructions, easier_variant, harder_variant) values
  ('squat', 'Squat', 'bacak',
   'Ayaklar omuz genişliğinde, kalçayı geriye ver ve göğsü dik tut. Dizler ayak parmak hizasını takip etsin, uyluk yere paralel olana kadar in.',
   'Sandalyeye oturup kalkarak yap.',
   'Elinde bir ağırlıkla (goblet) veya tek bacak desteksiz yap.'),
  ('push-up', 'Şınav', 'göğüs',
   'Vücut baştan topuğa tek bir çizgi. Dirsekler gövdeye 45 derece, göğüs yere yaklaşana kadar in ve kalçayı düşürme.',
   'Dizlerin üstünde ya da elleri bir sehpaya koyarak eğimli yap.',
   'Ayakları yükseltilmiş ya da tempoyu yavaşlatarak yap.')
on conflict (slug) do update
  set name           = excluded.name,
      muscle_group   = excluded.muscle_group,
      instructions   = excluded.instructions,
      easier_variant = excluded.easier_variant,
      harder_variant = excluded.harder_variant;

-- -----------------------------------------------------------------------------
-- The 60 days
-- -----------------------------------------------------------------------------
insert into public.program_days (day, title, day_type, walk_distance_km, target_minutes, notes)
select
  d.day,
  case d.day_type
    when 'rest' then 'Aktif Dinlenme'
    when 'walk' then 'Hızlı Yürüyüş'
    else 'Yürüyüş + Kuvvet'
  end,
  d.day_type,
  d.distance,
  -- Roughly 5.5 km/h brisk pace, plus ~12 minutes for the two strength rounds.
  (round(d.distance * 11) + case when d.day_type = 'walk_strength' then 12 else 0 end)::smallint,
  case
    when d.day = 1 then
      'Başlangıç kaydı: kilonu ve boyunu gir, önden/yandan/arkadan birer fotoğraf yükle. Bugün sadece yürü.'
    when d.day = 60 then
      'Son kayıt: kilonu gir ve bitiş fotoğraflarını yükle, ilk günle yan yana karşılaştır.'
    when d.day_type = 'rest' then
      'Hafta sonu kontrolü: kilonu ölç ve vücut fotoğraflarını yükle. Bugün ağırlık yok, sadece hafif bir yürüyüş.'
    when d.day_type = 'walk' then
      'Sadece yürüyüş. Konuşabildiğin ama şarkı söyleyemediğin tempoyu koru.'
    else
      'Yürüyüşten önce bir tur squat + şınav (ısınma), yürüyüşten sonra bir tur daha (bitirici).'
  end
from (
  select
    g::smallint as day,
    case
      when g % 7 = 0 then 'rest'::public.day_type
      when ((g - 1) / 7) + 1 = 1 then 'walk'::public.day_type
      else 'walk_strength'::public.day_type
    end as day_type,
    case
      when g % 7 = 0 then 2.0::numeric(4, 1)
      -- `g - g/7 - 1` is the zero-based index of this training session.
      else round(3.0 + 0.15 * (g - (g / 7) - 1), 1)::numeric(4, 1)
    end as distance
  from generate_series(1, 60) as g
) as d
on conflict (day) do update
  set title            = excluded.title,
      day_type         = excluded.day_type,
      walk_distance_km = excluded.walk_distance_km,
      target_minutes   = excluded.target_minutes,
      notes            = excluded.notes;

-- -----------------------------------------------------------------------------
-- Squat + push-up rounds, before and after the walk, from week 2 on.
-- Sets step up every three weeks, reps every week.
-- -----------------------------------------------------------------------------
insert into public.program_day_exercises (day, exercise_id, phase, order_index, sets, reps, rest_seconds)
select
  d.day,
  e.id,
  t.phase::public.phase_type,
  t.order_index::smallint,
  (case
     when d.week <= 4 then 2
     when d.week <= 7 then 3
     else 4
   end)::smallint as sets,
  (case t.slug
     when 'squat'   then 10 + (d.week - 2) * 2
     when 'push-up' then  6 + (d.week - 2) * 2
   end)::smallint as reps,
  t.rest_seconds::smallint
from public.program_days d
join (values
  ('pre',  1, 'squat',   60),
  ('pre',  2, 'push-up', 60),
  ('post', 1, 'squat',   75),
  ('post', 2, 'push-up', 75)
) as t(phase, order_index, slug, rest_seconds) on true
join public.exercises e on e.slug = t.slug
where d.day_type = 'walk_strength'
on conflict (day, phase, order_index) do update
  set exercise_id  = excluded.exercise_id,
      sets         = excluded.sets,
      reps         = excluded.reps,
      rest_seconds = excluded.rest_seconds;
