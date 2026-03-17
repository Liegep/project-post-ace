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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          allow_client_create_post: boolean
          allow_client_edit_caption: boolean
          created_at: string
          id: string
          locale: string
          logo_url: string
          name: string
          posting_period: string
          show_archived_to_client: boolean
          slug: string
          tracking_enabled: boolean
          trello_board_id: string
          updated_at: string
        }
        Insert: {
          allow_client_create_post?: boolean
          allow_client_edit_caption?: boolean
          created_at?: string
          id?: string
          locale?: string
          logo_url?: string
          name: string
          posting_period?: string
          show_archived_to_client?: boolean
          slug: string
          tracking_enabled?: boolean
          trello_board_id?: string
          updated_at?: string
        }
        Update: {
          allow_client_create_post?: boolean
          allow_client_edit_caption?: boolean
          created_at?: string
          id?: string
          locale?: string
          logo_url?: string
          name?: string
          posting_period?: string
          show_archived_to_client?: boolean
          slug?: string
          tracking_enabled?: boolean
          trello_board_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      columns: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          position: number
          trello_list_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          trello_list_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          trello_list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "columns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author: string
          created_at: string
          id: string
          post_id: string
          text: string
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          post_id: string
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_groups: {
        Row: {
          client_id: string
          created_at: string
          hashtags: string[]
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          hashtags?: string[]
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tracking: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          post_id: string
          step_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          post_id: string
          step_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          post_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tracking_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tracking_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "tracking_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          archived: boolean
          archived_at: string | null
          caption: string
          client_id: string | null
          client_label: string
          client_unarchived_at: string | null
          column_id: string | null
          created_at: string
          deadline: string | null
          id: string
          image_url: string
          media_type: string
          media_urls: string[]
          position: number
          status: string
          tags: string[]
          title: string
          trello_card_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          caption?: string
          client_id?: string | null
          client_label?: string
          client_unarchived_at?: string | null
          column_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          image_url: string
          media_type?: string
          media_urls?: string[]
          position?: number
          status?: string
          tags?: string[]
          title: string
          trello_card_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          caption?: string
          client_id?: string | null
          client_label?: string
          client_unarchived_at?: string | null
          column_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          image_url?: string
          media_type?: string
          media_urls?: string[]
          position?: number
          status?: string
          tags?: string[]
          title?: string
          trello_card_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          client_id: string | null
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id?: string | null
          color: string
          created_at?: string
          id: string
          name: string
        }
        Update: {
          client_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_steps: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracking_steps_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
