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
      customer_orders: {
        Row: {
          created_at: string
          customer_id: string
          customer_name: string
          deadline_date: string
          destination: string
          id: string
          order_number: string
          priority_level: Database["public"]["Enums"]["priority_level"]
          product_id: string
          product_name: string
          status: Database["public"]["Enums"]["order_status"]
          tonnage_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_name: string
          deadline_date: string
          destination: string
          id?: string
          order_number: string
          priority_level?: Database["public"]["Enums"]["priority_level"]
          product_id: string
          product_name: string
          status?: Database["public"]["Enums"]["order_status"]
          tonnage_required: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_name?: string
          deadline_date?: string
          destination?: string
          id?: string
          order_number?: string
          priority_level?: Database["public"]["Enums"]["priority_level"]
          product_id?: string
          product_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          tonnage_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          product_name: string
          stockyard_id: string
          stockyard_name: string
          tonnage_available: number
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          product_name: string
          stockyard_id: string
          stockyard_name: string
          tonnage_available: number
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          product_name?: string
          stockyard_id?: string
          stockyard_name?: string
          tonnage_available?: number
          updated_at?: string
        }
        Relationships: []
      }
      loading_points: {
        Row: {
          capacity_tph: number
          compatible_products: string[]
          id: string
          operational_status: Database["public"]["Enums"]["loading_point_status"]
          point_id: string
          point_name: string
          updated_at: string
        }
        Insert: {
          capacity_tph: number
          compatible_products: string[]
          id?: string
          operational_status?: Database["public"]["Enums"]["loading_point_status"]
          point_id: string
          point_name: string
          updated_at?: string
        }
        Update: {
          capacity_tph?: number
          compatible_products?: string[]
          id?: string
          operational_status?: Database["public"]["Enums"]["loading_point_status"]
          point_id?: string
          point_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rake_plan_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          rake_plan_id: string
          tonnage_allocated: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          rake_plan_id: string
          tonnage_allocated: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          rake_plan_id?: string
          tonnage_allocated?: number
        }
        Relationships: [
          {
            foreignKeyName: "rake_plan_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rake_plan_orders_rake_plan_id_fkey"
            columns: ["rake_plan_id"]
            isOneToOne: false
            referencedRelation: "rake_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      rake_plans: {
        Row: {
          assigned_loading_point: string
          composite_priority_score: number | null
          created_at: string
          destinations: string[]
          estimated_dispatch_time: string | null
          estimated_total_cost: number
          id: string
          origin_stockyard: string
          plan_date: string
          rake_id: string
          total_tonnage: number
          utilization_percentage: number
          wagon_count: number
          wagon_type: string
        }
        Insert: {
          assigned_loading_point: string
          composite_priority_score?: number | null
          created_at?: string
          destinations: string[]
          estimated_dispatch_time?: string | null
          estimated_total_cost: number
          id?: string
          origin_stockyard: string
          plan_date?: string
          rake_id: string
          total_tonnage: number
          utilization_percentage: number
          wagon_count: number
          wagon_type: string
        }
        Update: {
          assigned_loading_point?: string
          composite_priority_score?: number | null
          created_at?: string
          destinations?: string[]
          estimated_dispatch_time?: string | null
          estimated_total_cost?: number
          id?: string
          origin_stockyard?: string
          plan_date?: string
          rake_id?: string
          total_tonnage?: number
          utilization_percentage?: number
          wagon_count?: number
          wagon_type?: string
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          created_at: string
          id: string
          reason: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          created_at: string
          id: string
          result_plan_ids: string[] | null
          scenario_config: Json
          scenario_name: string
          scenario_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_plan_ids?: string[] | null
          scenario_config: Json
          scenario_name: string
          scenario_type: string
        }
        Update: {
          created_at?: string
          id?: string
          result_plan_ids?: string[] | null
          scenario_config?: Json
          scenario_name?: string
          scenario_type?: string
        }
        Relationships: []
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
      wagon_availability: {
        Row: {
          available_count: number
          id: string
          total_count: number
          updated_at: string
          wagon_type: string
        }
        Insert: {
          available_count: number
          id?: string
          total_count: number
          updated_at?: string
          wagon_type: string
        }
        Update: {
          available_count?: number
          id?: string
          total_count?: number
          updated_at?: string
          wagon_type?: string
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
      app_role: "admin" | "senior_planner" | "planner" | "viewer"
      loading_point_status: "active" | "inactive" | "maintenance"
      order_status: "open" | "planned" | "dispatched" | "completed"
      priority_level: "critical" | "high" | "medium" | "low"
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
      app_role: ["admin", "senior_planner", "planner", "viewer"],
      loading_point_status: ["active", "inactive", "maintenance"],
      order_status: ["open", "planned", "dispatched", "completed"],
      priority_level: ["critical", "high", "medium", "low"],
    },
  },
} as const
