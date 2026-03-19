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
          client_ids: string[]
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_ids?: string[]
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          client_ids?: string[]
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          message: string
          post_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string
          post_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string
          post_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
      appointment_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          cancelled: boolean
          cancelled_at: string | null
          category: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string
          id: string
          tag_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string
          cancelled?: boolean
          cancelled_at?: string | null
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          tag_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          cancelled?: boolean
          cancelled_at?: string | null
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          tag_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "appointment_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_attachments: {
        Row: {
          brief_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          brief_id: string
          created_at?: string
          file_name?: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          brief_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_attachments_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_comments: {
        Row: {
          author_name: string
          author_role: string
          brief_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          author_name?: string
          author_role?: string
          brief_id: string
          created_at?: string
          id?: string
          message?: string
          user_id: string
        }
        Update: {
          author_name?: string
          author_role?: string
          brief_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_comments_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_posts: {
        Row: {
          caption: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          media_type: string
          media_urls: string[]
          publish_date: string
          publish_time: string
          status: Database["public"]["Enums"]["calendar_post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_type?: string
          media_urls?: string[]
          publish_date: string
          publish_time?: string
          status?: Database["public"]["Enums"]["calendar_post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_type?: string
          media_urls?: string[]
          publish_date?: string
          publish_time?: string
          status?: Database["public"]["Enums"]["calendar_post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          attachments: Json
          client_id: string
          color: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          client_id: string
          color?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          client_id?: string
          color?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          allow_client_create_post: boolean
          allow_client_edit_caption: boolean
          created_at: string
          facebook_url: string
          id: string
          instagram_url: string
          linkedin_url: string
          locale: string
          logo_url: string
          name: string
          posting_period: string
          show_archived_to_client: boolean
          slug: string
          tiktok_url: string
          tracking_enabled: boolean
          tracking_visible_to_client: boolean
          trello_board_id: string
          twitter_url: string
          updated_at: string
          website_url: string
          youtube_url: string
        }
        Insert: {
          allow_client_create_post?: boolean
          allow_client_edit_caption?: boolean
          created_at?: string
          facebook_url?: string
          id?: string
          instagram_url?: string
          linkedin_url?: string
          locale?: string
          logo_url?: string
          name: string
          posting_period?: string
          show_archived_to_client?: boolean
          slug: string
          tiktok_url?: string
          tracking_enabled?: boolean
          tracking_visible_to_client?: boolean
          trello_board_id?: string
          twitter_url?: string
          updated_at?: string
          website_url?: string
          youtube_url?: string
        }
        Update: {
          allow_client_create_post?: boolean
          allow_client_edit_caption?: boolean
          created_at?: string
          facebook_url?: string
          id?: string
          instagram_url?: string
          linkedin_url?: string
          locale?: string
          logo_url?: string
          name?: string
          posting_period?: string
          show_archived_to_client?: boolean
          slug?: string
          tiktok_url?: string
          tracking_enabled?: boolean
          tracking_visible_to_client?: boolean
          trello_board_id?: string
          twitter_url?: string
          updated_at?: string
          website_url?: string
          youtube_url?: string
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
          visible_to_client: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          trello_list_id?: string | null
          visible_to_client?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          trello_list_id?: string | null
          visible_to_client?: boolean
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
      content_briefs: {
        Row: {
          assigned_to: string | null
          caption: string
          client_id: string
          content_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          internal_notes: string
          planned_date: string | null
          status: Database["public"]["Enums"]["brief_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          caption?: string
          client_id: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          internal_notes?: string
          planned_date?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          caption?: string
          client_id?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          internal_notes?: string
          planned_date?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      idea_columns: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          column_id: string
          created_at: string
          description: string
          id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          column_id: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          title: string
          user_id: string
        }
        Update: {
          column_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "idea_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_accounts: {
        Row: {
          access_token: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          meta_user_id: string
          meta_user_name: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          meta_user_id: string
          meta_user_name?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          meta_user_id?: string
          meta_user_name?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_pages: {
        Row: {
          client_id: string
          created_at: string
          id: string
          instagram_account_id: string | null
          instagram_username: string | null
          meta_account_id: string
          page_access_token: string
          page_id: string
          page_name: string
          platform: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          instagram_username?: string | null
          meta_account_id: string
          page_access_token: string
          page_id: string
          page_name?: string
          platform?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          instagram_username?: string | null
          meta_account_id?: string
          page_access_token?: string
          page_id?: string
          page_name?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_pages_meta_account_id_fkey"
            columns: ["meta_account_id"]
            isOneToOne: false
            referencedRelation: "meta_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_feedback: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string
          post_id: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message?: string
          post_id: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          post_id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_feedback_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          post_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          post_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_status_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
          client_created_at: string | null
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
          status: string[]
          tags: string[]
          title: string
          trello_card_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          caption?: string
          client_created_at?: string | null
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
          status?: string[]
          tags?: string[]
          title: string
          trello_card_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          caption?: string
          client_created_at?: string | null
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
          status?: string[]
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
      profiles: {
        Row: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          email?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      social_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          social_post_id: string
          success: boolean
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          social_post_id: string
          success?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          social_post_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "social_logs_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_history: {
        Row: {
          change_note: string
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["social_post_status"]
          old_status: Database["public"]["Enums"]["social_post_status"] | null
          social_post_id: string
        }
        Insert: {
          change_note?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["social_post_status"]
          old_status?: Database["public"]["Enums"]["social_post_status"] | null
          social_post_id: string
        }
        Update: {
          change_note?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["social_post_status"]
          old_status?: Database["public"]["Enums"]["social_post_status"] | null
          social_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_history_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string
          client_id: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          media_type: string
          media_urls: string[]
          meta_page_id: string | null
          meta_post_id: string | null
          notes: string
          platform: string
          published_at: string | null
          retry_count: number
          scheduled_at: string | null
          status: Database["public"]["Enums"]["social_post_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string
          client_id: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_type?: string
          media_urls?: string[]
          meta_page_id?: string | null
          meta_post_id?: string | null
          notes?: string
          platform?: string
          published_at?: string | null
          retry_count?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_type?: string
          media_urls?: string[]
          meta_page_id?: string | null
          meta_post_id?: string | null
          notes?: string
          platform?: string
          published_at?: string | null
          retry_count?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_meta_page_id_fkey"
            columns: ["meta_page_id"]
            isOneToOne: false
            referencedRelation: "meta_pages"
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
      tracking_order: {
        Row: {
          client_id: string
          id: string
          post_ids: string[]
          updated_at: string
        }
        Insert: {
          client_id: string
          id?: string
          post_ids?: string[]
          updated_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          post_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_order_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
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
      user_client_assignments: {
        Row: {
          assigned_by: string | null
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_assignments_client_id_fkey"
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
      get_user_client_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team_member" | "client"
      brief_status:
        | "draft"
        | "internal"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "published"
      calendar_post_status:
        | "draft"
        | "in_review"
        | "approved"
        | "scheduled"
        | "published"
      social_post_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "scheduled"
        | "publishing"
        | "published"
        | "error"
        | "cancelled"
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
      app_role: ["admin", "team_member", "client"],
      brief_status: [
        "draft",
        "internal",
        "pending_approval",
        "approved",
        "rejected",
        "published",
      ],
      calendar_post_status: [
        "draft",
        "in_review",
        "approved",
        "scheduled",
        "published",
      ],
      social_post_status: [
        "draft",
        "pending_approval",
        "approved",
        "scheduled",
        "publishing",
        "published",
        "error",
        "cancelled",
      ],
    },
  },
} as const
