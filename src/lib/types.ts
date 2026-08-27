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
  published: boolean;
  is_premium: boolean;
  content_rating: string | null;
  language: string | null;
  subtitle_languages: string[] | null;
  license_note: string | null;
  is_sample_data: boolean;
};

export type Season = {
  id: string;
  series_id: string;
  season_number: number;
  title: string | null;
};

/** Colunas públicas de episódio. `video_url` / `media_path` nunca são lidos direto. */
export const EPISODE_COLUMNS =
  "id, season_id, series_id, episode_number, title, synopsis, duration_seconds, thumbnail_url, created_at, published, is_premium, language, subtitle_languages, license_note";

export type Episode = {
  id: string;
  season_id: string;
  series_id: string;
  episode_number: number;
  title: string;
  synopsis: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  published: boolean;
  is_premium: boolean;
  language: string | null;
  subtitle_languages: string[] | null;
  license_note: string | null;
};

export type WatchProgress = {
  user_id: string;
  episode_id: string;
  series_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

export type SubscriptionStatus = "active" | "suspended" | "expired" | "cancelled";

export type Subscription = {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  source: string;
  external_reference: string | null;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivationCode = {
  id: string;
  code_last4: string;
  status: "available" | "redeemed" | "revoked" | "expired";
  note: string | null;
  grants_days: number | null;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  expires_at: string | null;
};

export const TYPE_LABEL: Record<DramaType, string> = {
  kdrama: "K-Drama",
  jdrama: "J-Drama",
  cdrama: "C-Drama",
};

export const SUB_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  expired: "Expirado",
  cancelled: "Cancelado",
};
