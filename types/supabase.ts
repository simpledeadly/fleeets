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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          category: string | null
          created_at: string | null
          details: Json | null
          ended_at: string
          id: number
          source: string
          started_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          details?: Json | null
          ended_at: string
          id?: never
          source: string
          started_at: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          details?: Json | null
          ended_at?: string
          id?: never
          source?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_system: boolean | null
          model_settings: Json | null
          name: string
          system_prompt: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          model_settings?: Json | null
          name: string
          system_prompt: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          model_settings?: Json | null
          name?: string
          system_prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string | null
          extracted_text: string | null
          id: string
          item_id: string | null
          mime_type: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extracted_text?: string | null
          id?: string
          item_id?: string | null
          mime_type: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          extracted_text?: string | null
          id?: string
          item_id?: string | null
          mime_type?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_sessions: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          tokens: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          status?: string | null
          tokens?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          tokens?: Json | null
        }
        Relationships: []
      }
      blueprints: {
        Row: {
          created_at: string | null
          created_by_agent_id: string | null
          data_snapshot: Json | null
          description: string | null
          id: string
          is_applied: boolean | null
          manifesto_snapshot: string | null
          name: string
          scope_id: string
          user_id: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by_agent_id?: string | null
          data_snapshot?: Json | null
          description?: string | null
          id?: string
          is_applied?: boolean | null
          manifesto_snapshot?: string | null
          name: string
          scope_id: string
          user_id?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by_agent_id?: string | null
          data_snapshot?: Json | null
          description?: string | null
          id?: string
          is_applied?: boolean | null
          manifesto_snapshot?: string | null
          name?: string
          scope_id?: string
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_created_by_agent_id_fkey"
            columns: ["created_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprints_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox: {
        Row: {
          created_at: string | null
          id: number
          raw_text: string | null
          status: string | null
          structured_data: Json | null
          telegram_chat_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          raw_text?: string | null
          status?: string | null
          structured_data?: Json | null
          telegram_chat_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          raw_text?: string | null
          status?: string | null
          structured_data?: Json | null
          telegram_chat_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      items: {
        Row: {
          ai_tags: string[] | null
          completed_at: string | null
          content: string
          created_at: string | null
          created_by_agent_id: string | null
          description: string | null
          embedding: string | null
          execution_log: string | null
          first_interaction_at: string | null
          id: string
          in_roadmap: boolean | null
          interaction_count: number | null
          is_quick: boolean | null
          metadata: Json | null
          parent_id: string | null
          planned_at: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          raw_content: string | null
          revision_count: number | null
          scope_id: string | null
          sentiment: string | null
          status: Database["public"]["Enums"]["item_status"] | null
          triaged_at: string | null
          type: Database["public"]["Enums"]["item_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_tags?: string[] | null
          completed_at?: string | null
          content: string
          created_at?: string | null
          created_by_agent_id?: string | null
          description?: string | null
          embedding?: string | null
          execution_log?: string | null
          first_interaction_at?: string | null
          id?: string
          in_roadmap?: boolean | null
          interaction_count?: number | null
          is_quick?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          planned_at?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          raw_content?: string | null
          revision_count?: number | null
          scope_id?: string | null
          sentiment?: string | null
          status?: Database["public"]["Enums"]["item_status"] | null
          triaged_at?: string | null
          type?: Database["public"]["Enums"]["item_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_tags?: string[] | null
          completed_at?: string | null
          content?: string
          created_at?: string | null
          created_by_agent_id?: string | null
          description?: string | null
          embedding?: string | null
          execution_log?: string | null
          first_interaction_at?: string | null
          id?: string
          in_roadmap?: boolean | null
          interaction_count?: number | null
          is_quick?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          planned_at?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          raw_content?: string | null
          revision_count?: number | null
          scope_id?: string | null
          sentiment?: string | null
          status?: Database["public"]["Enums"]["item_status"] | null
          triaged_at?: string | null
          type?: Database["public"]["Enums"]["item_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_created_by_agent_id_fkey"
            columns: ["created_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_completed: boolean | null
          is_pinned: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_completed?: boolean | null
          is_pinned?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_completed?: boolean | null
          is_pinned?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_scope_id: string | null
          billing_customer_id: string | null
          created_at: string | null
          id: string
          manifesto: Json | null
          settings: Json | null
          telegram_id: number | null
          updated_at: string | null
        }
        Insert: {
          active_scope_id?: string | null
          billing_customer_id?: string | null
          created_at?: string | null
          id: string
          manifesto?: Json | null
          settings?: Json | null
          telegram_id?: number | null
          updated_at?: string | null
        }
        Update: {
          active_scope_id?: string | null
          billing_customer_id?: string | null
          created_at?: string | null
          id?: string
          manifesto?: Json | null
          settings?: Json | null
          telegram_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_scope_id_fkey"
            columns: ["active_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      scopes: {
        Row: {
          active_blueprint_id: string | null
          created_at: string | null
          description: string | null
          id: string
          manifesto: string | null
          name: string
          slug: string
          theme_config: Json | null
          updated_at: string | null
          user_id: string
          view_config: Json | null
          view_type: string | null
        }
        Insert: {
          active_blueprint_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          manifesto?: string | null
          name: string
          slug: string
          theme_config?: Json | null
          updated_at?: string | null
          user_id: string
          view_config?: Json | null
          view_type?: string | null
        }
        Update: {
          active_blueprint_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          manifesto?: string | null
          name?: string
          slug?: string
          theme_config?: Json | null
          updated_at?: string | null
          user_id?: string
          view_config?: Json | null
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scopes_active_blueprint_id_fkey"
            columns: ["active_blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id: string
          price_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          action: string
          cost_usd: number | null
          created_at: string | null
          id: number
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          cost_usd?: number | null
          created_at?: string | null
          id?: never
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          cost_usd?: number | null
          created_at?: string | null
          id?: never
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          daily_focus: Json | null
          life_context: string | null
          preferences: Json
          telegram_chat_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          daily_focus?: Json | null
          life_context?: string | null
          preferences?: Json
          telegram_chat_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          daily_focus?: Json | null
          life_context?: string | null
          preferences?: Json
          telegram_chat_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_report: {
        Args: { target_date: string; user_uuid: string }
        Returns: Json
      }
      get_daily_usage: { Args: { uid: string }; Returns: number }
      get_item_total_duration: { Args: { item_uuid: string }; Returns: number }
      get_weekly_report: { Args: { user_uuid: string }; Returns: Json }
      get_weekly_summary: { Args: { user_uuid: string }; Returns: Json }
      match_items: {
        Args: {
          filter_scope_id?: string
          match_count: number
          match_threshold: number
          query_embedding: string
          user_id_input: string
        }
        Returns: {
          ai_tags: string[]
          content: string
          description: string
          id: string
          is_quick: boolean
          priority: Database["public"]["Enums"]["priority_level"]
          scope_id: string
          similarity: number
          status: Database["public"]["Enums"]["item_status"]
          type: Database["public"]["Enums"]["item_type"]
        }[]
      }
    }
    Enums: {
      item_status:
        | "inbox"
        | "planned"
        | "today"
        | "done"
        | "archived"
        | "deleted"
      item_type:
        | "task"
        | "note"
        | "resource"
        | "thought"
        | "objective"
        | "key_result"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      priority_level: "low" | "medium" | "high" | "critical"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
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
      item_status: ["inbox", "planned", "today", "done", "archived", "deleted"],
      item_type: [
        "task",
        "note",
        "resource",
        "thought",
        "objective",
        "key_result",
      ],
      pricing_plan_interval: ["day", "week", "month", "year"],
      priority_level: ["low", "medium", "high", "critical"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
      ],
    },
  },
} as const
