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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      about_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          section_id: string | null
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          section_id?: string | null
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          section_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "about_images_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "about_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      about_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_memories: {
        Row: {
          created_at: string
          id: string
          last_conversation_at: string
          memory: Json
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_conversation_at?: string
          memory?: Json
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_conversation_at?: string
          memory?: Json
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      gold_analysis: {
        Row: {
          created_at: string
          gold_data: Json
          id: string
          news_data: Json
          silver_data: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gold_data?: Json
          id?: string
          news_data?: Json
          silver_data?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gold_data?: Json
          id?: string
          news_data?: Json
          silver_data?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gold_analysis_log: {
        Row: {
          created_at: string
          gold_price: number | null
          id: string
          message: string | null
          status: string
          trigger_type: string
        }
        Insert: {
          created_at?: string
          gold_price?: number | null
          id?: string
          message?: string | null
          status?: string
          trigger_type?: string
        }
        Update: {
          created_at?: string
          gold_price?: number | null
          id?: string
          message?: string | null
          status?: string
          trigger_type?: string
        }
        Relationships: []
      }
      gold_daily_summary: {
        Row: {
          change_buy: number
          change_pct: number
          close_buy: number
          close_sell: number
          date: string
          high_buy: number
          low_buy: number
          open_buy: number
          open_sell: number
          point_count: number
          updated_at: string
        }
        Insert: {
          change_buy?: number
          change_pct?: number
          close_buy?: number
          close_sell?: number
          date: string
          high_buy?: number
          low_buy?: number
          open_buy?: number
          open_sell?: number
          point_count?: number
          updated_at?: string
        }
        Update: {
          change_buy?: number
          change_pct?: number
          close_buy?: number
          close_sell?: number
          date?: string
          high_buy?: number
          low_buy?: number
          open_buy?: number
          open_sell?: number
          point_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      gold_price_history: {
        Row: {
          buy_price: number
          created_at: string
          date: string
          id: string
          is_after_hours: boolean
          is_close: boolean
          is_open: boolean
          sell_price: number
          time: string
        }
        Insert: {
          buy_price: number
          created_at?: string
          date: string
          id?: string
          is_after_hours?: boolean
          is_close?: boolean
          is_open?: boolean
          sell_price: number
          time: string
        }
        Update: {
          buy_price?: number
          created_at?: string
          date?: string
          id?: string
          is_after_hours?: boolean
          is_close?: boolean
          is_open?: boolean
          sell_price?: number
          time?: string
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_auto: boolean
          is_published: boolean
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_auto?: boolean
          is_published?: boolean
          sort_order?: number
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_auto?: boolean
          is_published?: boolean
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_analysis: {
        Row: {
          analysis_data: Json
          created_at: string | null
          id: string
          source: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_data?: Json
          created_at?: string | null
          id?: string
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_data?: Json
          created_at?: string | null
          id?: string
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      price_edit_history: {
        Row: {
          edited_at: string
          edited_by: string | null
          id: string
          item_name: string
          new_buy: string | null
          new_sell: string | null
          old_buy: string | null
          old_sell: string | null
          price_type: string
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          item_name: string
          new_buy?: string | null
          new_sell?: string | null
          old_buy?: string | null
          old_sell?: string | null
          price_type: string
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          item_name?: string
          new_buy?: string | null
          new_sell?: string | null
          old_buy?: string | null
          old_sell?: string | null
          price_type?: string
        }
        Relationships: []
      }
      price_overrides: {
        Row: {
          buy_price: string | null
          created_at: string
          id: string
          is_active: boolean
          item_name: string
          price_type: string
          sell_price: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          buy_price?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          item_name: string
          price_type: string
          sell_price?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          buy_price?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          item_name?: string
          price_type?: string
          sell_price?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          karat: string | null
          name: string
          price: number | null
          price_type: string | null
          sort_order: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          karat?: string | null
          name: string
          price?: number | null
          price_type?: string | null
          sort_order?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          karat?: string | null
          name?: string
          price?: number | null
          price_type?: string | null
          sort_order?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          purchase_count: number
          tier: Database["public"]["Enums"]["customer_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          purchase_count?: number
          tier?: Database["public"]["Enums"]["customer_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          purchase_count?: number
          tier?: Database["public"]["Enums"]["customer_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_tier: {
        Args: { p_count: number }
        Returns: Database["public"]["Enums"]["customer_tier"]
      }
      cleanup_old_gold_data: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      customer_tier: "thuong" | "vip" | "sieu_vip"
      product_category: "vang_10k" | "vang_14k" | "vang_18k" | "bac"
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
      app_role: ["admin", "user"],
      customer_tier: ["thuong", "vip", "sieu_vip"],
      product_category: ["vang_10k", "vang_14k", "vang_18k", "bac"],
    },
  },
} as const
