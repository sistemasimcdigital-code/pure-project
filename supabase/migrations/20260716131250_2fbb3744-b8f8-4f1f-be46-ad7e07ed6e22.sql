
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.drama_type AS ENUM ('kdrama', 'jdrama', 'cdrama');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Series
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  synopsis TEXT,
  type drama_type NOT NULL,
  year INT,
  rating NUMERIC(3,1),
  poster_url TEXT,
  backdrop_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  episode_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.series TO anon, authenticated;
GRANT ALL ON public.series TO service_role;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "series_read_all" ON public.series FOR SELECT USING (true);
CREATE POLICY "series_admin_all" ON public.series FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seasons
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  season_number INT NOT NULL,
  title TEXT,
  UNIQUE (series_id, season_number)
);
GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read_all" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "seasons_admin_all" ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Episodes
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  episode_number INT NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  duration_seconds INT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, episode_number)
);
GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "episodes_read_all" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "episodes_admin_all" ON public.episodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Watch progress
CREATE TABLE public.watch_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  progress_seconds INT NOT NULL DEFAULT 0,
  duration_seconds INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wp_own" ON public.watch_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed data: 8 series, one season each, 2-3 episodes each. Uses public sample videos.
DO $$
DECLARE
  s1 UUID; s2 UUID; s3 UUID; s4 UUID; s5 UUID; s6 UUID; s7 UUID; s8 UUID;
  se UUID;
BEGIN
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, featured, episode_count) VALUES
    ('Crimson Moonlight', 'A palace intrigue drama where a young royal must choose between love and duty as she uncovers a centuries-old conspiracy.', 'kdrama', 2024, 9.1, 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=600', 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=1600', true, 2)
  RETURNING id INTO s1;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Neon Seoul', 'Two hackers in near-future Seoul chase a data phantom that knows their darkest secrets.', 'kdrama', 2025, 8.7, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600', 2) RETURNING id INTO s2;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Tokyo Rainfall', 'A jazz pianist and a novelist meet on the last night of a rainy summer in Shibuya.', 'jdrama', 2023, 8.4, 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600', 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1600', 2) RETURNING id INTO s3;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Silent Kyoto', 'A tea master hides a swordsman past that catches up with him on the eve of the cherry blossom festival.', 'jdrama', 2024, 8.9, 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600', 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600', 2) RETURNING id INTO s4;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Empress of Willows', 'A commoner disguises herself to enter the imperial court and finds herself at the center of a coup.', 'cdrama', 2024, 9.3, 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1600', 2) RETURNING id INTO s5;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Shanghai Vapors', 'A 1930s detective in Shanghai untangles a jazz-club murder that leads to the Green Gang.', 'cdrama', 2023, 8.5, 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=600', 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=1600', 2) RETURNING id INTO s6;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Winter Confession', 'A ski resort love story where two strangers share a chalet during a blizzard.', 'kdrama', 2022, 8.1, 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=600', 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1600', 2) RETURNING id INTO s7;
  INSERT INTO public.series (title, synopsis, type, year, rating, poster_url, backdrop_url, episode_count) VALUES
    ('Osaka Nights', 'A ramen-shop apprentice discovers her grandmother''s recipe holds a family secret.', 'jdrama', 2025, 8.6, 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=600', 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=1600', 2) RETURNING id INTO s8;

  -- Sample video URLs (public MP4s)
  FOR se IN SELECT unnest(ARRAY[s1,s2,s3,s4,s5,s6,s7,s8]) LOOP
    DECLARE season_id UUID;
    BEGIN
      INSERT INTO public.seasons (series_id, season_number, title) VALUES (se, 1, 'Season 1') RETURNING id INTO season_id;
      INSERT INTO public.episodes (season_id, series_id, episode_number, title, synopsis, duration_seconds, thumbnail_url, video_url) VALUES
        (season_id, se, 1, 'Episode 1: Beginnings', 'The story begins with a stranger arriving in town.', 596, 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'),
        (season_id, se, 2, 'Episode 2: Sparks', 'Two lives collide and nothing is the same again.', 653, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4');
    END;
  END LOOP;
END $$;
