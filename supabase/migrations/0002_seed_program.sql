-- =============================================================================
-- 60dayfit — exercise library and the 60-day program template
-- =============================================================================
-- Idempotent: safe to re-run. The program is a repeating 7-day cycle
--   1 itme · 2 bacak · 3 kardiyo · 4 çekme · 5 core · 6 full body · 7 dinlenme
-- with progressive overload applied per week rather than per day.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Exercise library
-- -----------------------------------------------------------------------------
insert into public.exercises (slug, name, muscle_group, equipment, instructions) values
  -- itme
  ('bench-press',            'Bench Press',              'göğüs',     'barbell',            'Omuz bıçaklarını sıkıştır, barı göğüs ortasına kontrollü indir.'),
  ('dumbbell-shoulder-press','Dambıl Omuz Press',         'omuz',      'dambıl',             'Bel çukurunu koruyarak dambılları tepede kilitlemeden yukarı it.'),
  ('push-up',                'Şınav',                     'göğüs',     'vücut ağırlığı',     'Vücut baştan topuğa tek bir çizgi; dirsekler 45 derece açıda.'),
  ('incline-dumbbell-press', 'Eğimli Dambıl Press',       'göğüs',     'dambıl',             'Sehpayı 30 derece ayarla, hareketi üst göğüste hissetmeye odaklan.'),
  ('cable-fly',              'Kablo Fly',                 'göğüs',     'kablo',              'Dirsekleri hafif bükülü sabit tut, hareketi omuzdan başlat.'),
  ('triceps-pushdown',       'Triceps Pushdown',          'triceps',   'kablo',              'Dirsekleri gövdeye sabitle, sadece ön kolu hareket ettir.'),
  -- bacak
  ('back-squat',             'Squat',                     'bacak',     'barbell',            'Kalçayı geriye ver, dizler ayak parmak hizasını takip etsin.'),
  ('romanian-deadlift',      'Romanian Deadlift',         'hamstring', 'barbell',            'Dizler hafif bükülü, barı bacak boyunca kaydırarak kalçadan kır.'),
  ('bulgarian-split-squat',  'Bulgar Split Squat',        'bacak',     'dambıl',             'Arka ayak sehpada, ağırlığı ön bacağa ver, gövdeyi dik tut.'),
  ('leg-press',              'Leg Press',                 'bacak',     'makine',             'Dizleri tam kilitleme, beli minderden ayırma.'),
  ('glute-bridge',           'Kalça Köprüsü',             'kalça',     'vücut ağırlığı',     'Tepede kalçayı bir saniye sık, kaburgayı yukarı kaldırma.'),
  ('calf-raise',             'Baldır Kaldırma',           'baldır',    'dambıl',             'Tam gerilme için topuğu aşağı indir, tepede iki saniye bekle.'),
  -- kardiyo
  ('skipping-rope',          'İp Atlama',                 'kardiyo',   'ip',                 'Bilekten çevir, dizleri yumuşak tut, ayak ucunda kal.'),
  ('burpee',                 'Burpee',                    'kardiyo',   'vücut ağırlığı',     'Şınav pozisyonuna geç, göğsü yere değdir, patlayıcı biçimde zıpla.'),
  ('mountain-climber',       'Mountain Climber',          'kardiyo',   'vücut ağırlığı',     'Kalçayı sabit tut, dizleri hızlı biçimde göğse çek.'),
  ('high-knees',             'Yüksek Diz Koşusu',         'kardiyo',   'vücut ağırlığı',     'Dizleri kalça hizasına kadar kaldır, kolları aktif kullan.'),
  ('jumping-jack',           'Jumping Jack',              'kardiyo',   'vücut ağırlığı',     'Kolları tam yukarı götür, iniş sırasında dizleri hafif bük.'),
  ('incline-walk',           'Eğimli Yürüyüş',            'kardiyo',   'koşu bandı',         'Yüzde 8-10 eğim, tutamaçlara yüklenmeden tempolu yürü.'),
  -- çekme
  ('pull-up',                'Barfiks',                   'sırt',      'barfiks',            'Omuz bıçaklarını aşağı çek, çeneyi bar hizasının üstüne çıkar.'),
  ('barbell-row',            'Barbell Row',               'sırt',      'barbell',            'Gövde 45 derece, barı göbek hizasına çek, beli yuvarlatma.'),
  ('lat-pulldown',           'Lat Pulldown',              'sırt',      'makine',             'Göğsü yukarı aç, barı köprücük kemiğine doğru çek.'),
  ('dumbbell-row',           'Tek Kol Dambıl Row',        'sırt',      'dambıl',             'Gövdeyi sabitle, dambılı kalçaya doğru dirsekle çek.'),
  ('face-pull',              'Face Pull',                 'omuz',      'kablo',              'Halatı alın hizasına çek, dirsekleri bileklerden yukarıda tut.'),
  ('biceps-curl',            'Biceps Curl',               'biceps',    'dambıl',             'Dirsekleri gövdede sabitle, iniş fazını yavaşlat.'),
  -- core & mobilite
  ('plank',                  'Plank',                     'core',      'vücut ağırlığı',     'Kalçayı sık, beli çökertme, nefesi tutmadan sabit kal.'),
  ('dead-bug',               'Dead Bug',                  'core',      'vücut ağırlığı',     'Bel yere yapışık; karşı kol ve bacağı aynı anda uzat.'),
  ('hollow-hold',            'Hollow Hold',               'core',      'vücut ağırlığı',     'Kürek kemikleri yerden ayrık, bel yere basılı kalsın.'),
  ('side-plank',             'Yan Plank',                 'core',      'vücut ağırlığı',     'Kalçayı yukarı it, omuz dirsek üzerinde dik dursun.'),
  ('leg-raise',              'Bacak Kaldırma',            'core',      'vücut ağırlığı',     'Bacakları düz tut, iniş sırasında beli yerden ayırma.'),
  ('world-greatest-stretch', 'Dünyanın En İyi Germesi',    'mobilite',  'vücut ağırlığı',     'Hamle pozisyonunda dirseği yere değdir, sonra gövdeyi yukarı aç.'),
  -- full body
  ('kettlebell-swing',       'Kettlebell Swing',          'full body', 'kettlebell',         'Hareketi kalçadan başlat, kolları sadece sallanmaya bırak.'),
  ('thruster',               'Thruster',                  'full body', 'dambıl',             'Squat ile press''i tek akışta birleştir, tepede gövdeyi kilitle.'),
  ('renegade-row',           'Renegade Row',              'full body', 'dambıl',             'Plank pozisyonunda kalçayı döndürmeden tek kol çek.'),
  ('bear-crawl',             'Ayı Yürüyüşü',              'full body', 'vücut ağırlığı',     'Dizler yerden bir karış yukarıda, kalçayı sallamadan ilerle.'),
  ('farmer-carry',           'Farmer Carry',              'full body', 'dambıl',             'Omuzları geride tut, kısa ve hızlı adımlarla yürü.'),
  ('bicycle-crunch',         'Bisiklet Mekiği',           'core',      'vücut ağırlığı',     'Dirsek ile karşı dizi buluştur, hareketi kontrollü yap.'),
  -- dinlenme
  ('walk',                   'Tempolu Yürüyüş',           'kardiyo',   'yok',                'Konuşabileceğin tempoda, kesintisiz yürü.'),
  ('yoga-flow',              'Yoga Akışı',                'mobilite',  'mat',                'Nefesle senkron geçişler yap, ağrı sınırına zorlamadan kal.'),
  ('foam-roll',              'Foam Roller',               'mobilite',  'foam roller',        'Gergin bölgede 30 saniye bekle, kemik üzerinden geçme.')
on conflict (slug) do update
  set name         = excluded.name,
      muscle_group = excluded.muscle_group,
      equipment    = excluded.equipment,
      instructions = excluded.instructions;

-- -----------------------------------------------------------------------------
-- The 60 days: a repeating 7-day cycle, with milestone notes on 1 / 30 / 60
-- -----------------------------------------------------------------------------
insert into public.program_days (day, title, focus, target_minutes, notes)
select
  g::smallint,
  c.title,
  c.focus::public.focus_type,
  c.target_minutes::smallint,
  case g
    when 1  then 'Başlangıç ölçümlerini al ve bir "önce" fotoğrafı çek.'
    when 30 then 'Yarı yol. Ölçümleri tekrarla ve ilk ayı gözden geçir.'
    when 60 then 'Son gün. Bitiş ölçümlerini al ve ilk günle karşılaştır.'
    else c.notes
  end
from generate_series(1, 60) as g
join (values
  (1, 'Üst Vücut · İtme',  'push',   45, 'Göğüs, omuz ve triceps. Isınmadan sonra ilk hareketi en ağır setle yap.'),
  (2, 'Alt Vücut · Güç',   'legs',   50, 'Squat ve kalça menteşesi. Tekniği ağırlığın önüne koy.'),
  (3, 'HIIT Kardiyo',      'cardio', 30, 'Yüksek nabız aralıkları. Setler arası aktif kal, tamamen durma.'),
  (4, 'Üst Vücut · Çekme', 'pull',   45, 'Sırt ve biceps. Her tekrarda omuz bıçaklarını önce aşağı çek.'),
  (5, 'Core & Mobilite',   'core',   35, 'Gövde stabilizasyonu ve esneklik. Nefesi tutmadan çalış.'),
  (6, 'Full Body Devre',   'full',   40, 'Hareketleri devre hâlinde yap, tur arası 90 saniye dinlen.'),
  (7, 'Aktif Dinlenme',    'rest',   20, 'Ağırlık yok. Hafif hareket, su ve uyku bugünün antrenmanı.')
) as c(cycle_position, title, focus, target_minutes, notes)
  on c.cycle_position = ((g - 1) % 7) + 1
on conflict (day) do update
  set title          = excluded.title,
      focus          = excluded.focus,
      target_minutes = excluded.target_minutes,
      notes          = excluded.notes;

-- -----------------------------------------------------------------------------
-- Exercises per focus, expanded across every matching day.
-- Progression: +1 set from week 5 onward, 15 s less rest from week 8 onward.
-- -----------------------------------------------------------------------------
insert into public.program_day_exercises (day, exercise_id, order_index, sets, reps, rest_seconds)
select
  d.day,
  e.id,
  t.order_index::smallint,
  (t.sets + case when d.week >= 5 and d.focus <> 'rest' then 1 else 0 end)::smallint,
  t.reps,
  (case when d.week >= 8 and t.rest_seconds > 30
        then t.rest_seconds - 15
        else t.rest_seconds end)::smallint
from public.program_days d
join (values
  -- itme
  ('push',   1, 'bench-press',             4, '8-10',               90),
  ('push',   2, 'dumbbell-shoulder-press', 3, '10-12',              75),
  ('push',   3, 'incline-dumbbell-press',  3, '10-12',              75),
  ('push',   4, 'push-up',                 3, '12-15',              60),
  ('push',   5, 'cable-fly',               3, '12-15',              60),
  ('push',   6, 'triceps-pushdown',        3, '12-15',              45),
  -- bacak
  ('legs',   1, 'back-squat',              4, '8-10',              120),
  ('legs',   2, 'romanian-deadlift',       3, '10-12',              90),
  ('legs',   3, 'bulgarian-split-squat',   3, '10 (tek bacak)',     75),
  ('legs',   4, 'leg-press',               3, '12-15',              90),
  ('legs',   5, 'glute-bridge',            3, '15',                 60),
  ('legs',   6, 'calf-raise',              4, '15-20',              45),
  -- kardiyo
  ('cardio', 1, 'skipping-rope',           4, '60 sn',              45),
  ('cardio', 2, 'burpee',                  4, '12',                 45),
  ('cardio', 3, 'mountain-climber',        4, '40 sn',              30),
  ('cardio', 4, 'high-knees',              4, '40 sn',              30),
  ('cardio', 5, 'jumping-jack',            3, '45 sn',              30),
  ('cardio', 6, 'incline-walk',            1, '10 dk',               0),
  -- çekme
  ('pull',   1, 'pull-up',                 4, '6-10',               90),
  ('pull',   2, 'barbell-row',             4, '8-10',               90),
  ('pull',   3, 'lat-pulldown',            3, '10-12',              75),
  ('pull',   4, 'dumbbell-row',            3, '10-12',              60),
  ('pull',   5, 'face-pull',               3, '15',                 45),
  ('pull',   6, 'biceps-curl',             3, '12',                 45),
  -- core & mobilite
  ('core',   1, 'plank',                   3, '45-60 sn',           45),
  ('core',   2, 'dead-bug',                3, '12 (tek taraf)',     45),
  ('core',   3, 'hollow-hold',             3, '30 sn',              45),
  ('core',   4, 'side-plank',              3, '30 sn (tek taraf)',  30),
  ('core',   5, 'leg-raise',               3, '12-15',              45),
  ('core',   6, 'world-greatest-stretch',  2, '8 (tek taraf)',      30),
  -- full body
  ('full',   1, 'kettlebell-swing',        4, '15',                 60),
  ('full',   2, 'thruster',                4, '10',                 75),
  ('full',   3, 'renegade-row',            3, '10 (tek taraf)',     60),
  ('full',   4, 'bear-crawl',              3, '30 sn',              45),
  ('full',   5, 'farmer-carry',            3, '40 m',               60),
  ('full',   6, 'bicycle-crunch',          3, '20',                 45),
  -- dinlenme
  ('rest',   1, 'walk',                    1, '30 dk',               0),
  ('rest',   2, 'yoga-flow',               1, '15 dk',               0),
  ('rest',   3, 'foam-roll',               1, '10 dk',               0)
) as t(focus, order_index, slug, sets, reps, rest_seconds)
  on t.focus::public.focus_type = d.focus
join public.exercises e on e.slug = t.slug
on conflict (day, order_index) do update
  set exercise_id  = excluded.exercise_id,
      sets         = excluded.sets,
      reps         = excluded.reps,
      rest_seconds = excluded.rest_seconds;
