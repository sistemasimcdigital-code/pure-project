-- 1) Remover apenas os registros marcados como dados de exemplo
DELETE FROM public.watch_progress WHERE series_id IN (SELECT id FROM public.series WHERE is_sample_data = true);
DELETE FROM public.episodes WHERE series_id IN (SELECT id FROM public.series WHERE is_sample_data = true);
DELETE FROM public.seasons WHERE series_id IN (SELECT id FROM public.series WHERE is_sample_data = true);
DELETE FROM public.series WHERE is_sample_data = true;

-- 2) Criar a série pré-cadastrada (rascunho, sem mídia)
WITH s AS (
  INSERT INTO public.series (title, synopsis, type, year, featured, is_dubbed, published, is_premium,
                             content_rating, language, license_note, episode_count, is_sample_data)
  VALUES (
    'A Noiva Errada do Príncipe',
    'Uma jovem se vê envolvida em um casamento inesperado e em uma disputa de poder no palácio. Entre identidades trocadas, alianças perigosas e sentimentos inesperados, ela precisa descobrir quem realmente está ao seu lado.',
    'cdrama', 2026, false, true, false, true,
    'Não informado', 'Chinês',
    'Conteúdo disponibilizado conforme autorização do responsável pelo catálogo.',
    6, false
  )
  RETURNING id
), t AS (
  INSERT INTO public.seasons (series_id, season_number, title)
  SELECT id, 1, 'Temporada 1' FROM s
  RETURNING id, series_id
)
INSERT INTO public.episodes (season_id, series_id, episode_number, title, published, is_premium, language, license_note)
SELECT t.id, t.series_id, v.n, v.t, false, true, 'Chinês',
       'Conteúdo disponibilizado conforme autorização do responsável pelo catálogo.'
FROM t, (VALUES (1,'Parte 1'),(2,'Parte 2'),(3,'Parte 3'),(4,'Parte 4'),(5,'Parte 5'),(6,'Parte Final')) AS v(n,t);