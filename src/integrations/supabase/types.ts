export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          code_hash: string
          code_last4: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          grants_days: number | null
          id: string
          note: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          status: Database["public"]["Enums"]["activation_code_status"]
        }
        Insert: {
          code_hash: string
          code_last4: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grants_days?: number | null
          id?: string
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: Database["public"]["Enums"]["activation_code_status"]
        }
        Update: {
          code_hash?: string
          code_last4?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grants_days?: number | null
          id?: string
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: Database["public"]["Enums"]["activation_code_status"]
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          duration_seconds: number | null
          episode_number: number
          id: string
          is_premium: boolean
          language: string | null
          license_note: string | null
          media_path: string | null
          published: boolean
          season_id: string
          series_id: string
          subtitle_languages: string[] | null
          synopsis: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          episode_number: number
          id?: string
          is_premium?: boolean
          language?: string | null
          license_note?: string | null
          media_path?: string | null
          published?: boolean
          season_id: string
          series_id: string
          subtitle_languages?: string[] | null
          synopsis?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          episode_number?: number
          id?: string
          is_premium?: boolean
          language?: string | null
          license_note?: string | null
          media_path?: string | null
          published?: boolean
          season_id?: string
          series_id?: string
          subtitle_languages?: string[] | null
          synopsis?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          id: string
          season_number: number
          series_id: string
          title: string | null
        }
        Insert: {
          id?: string
          season_number: number
          series_id: string
          title?: string | null
        }
        Update: {
          id?: string
          season_number?: number
          series_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          backdrop_url: string | null
          content_rating: string | null
          created_at: string
          episode_count: number
          featured: boolean
          id: string
          is_dubbed: boolean | null
          is_premium: boolean
          is_sample_data: boolean
          language: string | null
          license_note: string | null
          poster_url: string | null
          published: boolean
          rating: number | null
          source_platform: string | null
          subtitle_languages: string[] | null
          synopsis: string | null
          title: string
          type: Database["public"]["Enums"]["drama_type"]
          year: number | null
        }
        Insert: {
          backdrop_url?: string | null
          content_rating?: string | null
          created_at?: string
          episode_count?: number
          featured?: boolean
          id?: string
          is_dubbed?: boolean | null
          is_premium?: boolean
          is_sample_data?: boolean
          language?: string | null
          license_note?: string | null
          poster_url?: string | null
          published?: boolean
          rating?: number | null
          source_platform?: string | null
          subtitle_languages?: string[] | null
          synopsis?: string | null
          title: string
          type: Database["public"]["Enums"]["drama_type"]
          year?: number | null
        }
        Update: {
          backdrop_url?: string | null
          content_rating?: string | null
          created_at?: string
          episode_count?: number
          featured?: boolean
          id?: string
          is_dubbed?: boolean | null
          is_premium?: boolean
          is_sample_data?: boolean
          language?: string | null
          license_note?: string | null
          poster_url?: string | null
          published?: boolean
          rating?: number | null
          source_platform?: string | null
          subtitle_languages?: string[] | null
          synopsis?: string | null
          title?: string
          type?: Database["public"]["Enums"]["drama_type"]
          year?: number | null
        }
        Relationships: []
      }
      subscription_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          external_reference: string | null
          id: string
          source: Database["public"]["Enums"]["subscription_source"]
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_reference?: string | null
          id?: string
          source?: Database["public"]["Enums"]["subscription_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_reference?: string | null
          id?: string
          source?: Database["public"]["Enums"]["subscription_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_progress: {
        Row: {
          duration_seconds: number | null
          episode_id: string
          progress_seconds: number
          series_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          episode_id: string
          progress_seconds?: number
          series_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          episode_id?: string
          progress_seconds?: number
          series_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_progress_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_activation_code: {
        Args: {
          _code: string
          _expires_at?: string
          _grants_days?: number
          _note?: string
        }
        Returns: string
      }
      admin_list_episode_media: {
        Args: { _series_id: string }
        Returns: {
          episode_id: string
          media_path: string
          video_url: string
        }[]
      }
      admin_revoke_activation_code: {
        Args: { _code_id: string }
        Returns: undefined
      }
      admin_set_episode_media: {
        Args: { _episode_id: string; _media_path: string }
        Returns: undefined
      }
      admin_set_subscription: {
        Args: {
          _expires_at?: string
          _status: Database["public"]["Enums"]["subscription_status"]
          _user_id: string
        }
        Returns: undefined
      }
      get_episode_media: {
        Args: { _episode_id: string }
        Returns: {
          media_path: string
          video_url: string
        }[]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_activation_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      activation_code_status: "available" | "redeemed" | "revoked" | "expired"
      app_role: "admin" | "user"
      drama_type: "kdrama" | "jdrama" | "cdrama"
      subscription_source:
        | "facebook_manual"
        | "external_manual"
        | "activation_code"
      subscription_status: "active" | "suspended" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activation_code_status: ["available", "redeemed", "revoked", "expired"],
      app_role: ["admin", "user"],
      drama_type: ["kdrama", "jdrama", "cdrama"],
      subscription_source: [
        "facebook_manual",
        "external_manual",
        "activation_code",
      ],
      subscription_status: ["active", "suspended", "expired", "cancelled"],
    },
  },
} as const
