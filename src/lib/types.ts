export type DramaType = "kdrama" | "jdrama" | "cdrama";

export type Series = {
  id: string;
  title: string;
  synopsis: string | null;
  type: DramaType;
  year: number | null;
  rating: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  featured: boolean;
  episode_count: number;
  is_dubbed: boolean;
  source_platform: string | null;
};

export type Season = {
  id: string;
  series_id: string;
  season_number: number;
  title: string | null;
};

export type Episode = {
  id: string;
  season_id: string;
  series_id: string;
  episode_number: number;
  title: string;
  synopsis: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  video_url: string;
};

export type WatchProgress = {
  user_id: string;
  episode_id: string;
  series_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

export const TYPE_LABEL: Record<DramaType, string> = {
  kdrama: "K-Drama",
  jdrama: "J-Drama",
  cdrama: "C-Drama",
};
