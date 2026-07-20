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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allowed_users: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          username?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          allowed_emails: string[]
          clinic_name: string
          id: string
          therapist_name: string
          updated_at: string
        }
        Insert: {
          allowed_emails?: string[]
          clinic_name?: string
          id?: string
          therapist_name?: string
          updated_at?: string
        }
        Update: {
          allowed_emails?: string[]
          clinic_name?: string
          id?: string
          therapist_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          notes: string | null
          patient_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          visit_label_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          visit_label_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string | null
          type?: Database["public"]["Enums"]["appointment_type"]
          visit_label_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_visit_label_id_fkey"
            columns: ["visit_label_id"]
            isOneToOne: false
            referencedRelation: "visit_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          photo_path: string | null
          screen: string
          status: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          photo_path?: string | null
          screen: string
          status?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          photo_path?: string | null
          screen?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_proposals: {
        Row: {
          approved: boolean | null
          body: string
          created_at: string
          id: string
          patient_id: string
          reason: Database["public"]["Enums"]["marketing_reason"]
        }
        Insert: {
          approved?: boolean | null
          body: string
          created_at?: string
          id?: string
          patient_id: string
          reason: Database["public"]["Enums"]["marketing_reason"]
        }
        Update: {
          approved?: boolean | null
          body?: string
          created_at?: string
          id?: string
          patient_id?: string
          reason?: Database["public"]["Enums"]["marketing_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "marketing_proposals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          updated_at: string
        }
        Insert: {
          body: string
          id?: string
          kind: Database["public"]["Enums"]["message_kind"]
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          updated_at?: string
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          appointment_id: string | null
          body: string
          created_at: string
          delivered_at: string | null
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          patient_id: string
          processing_started_at: string | null
          provider_ref: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          kind: Database["public"]["Enums"]["message_kind"]
          patient_id: string
          processing_started_at?: string | null
          provider_ref?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          patient_id?: string
          processing_started_at?: string | null
          provider_ref?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      note_photos: {
        Row: {
          created_at: string
          id: string
          note_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_photos_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "visit_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          archived_at: string | null
          birth_date: string | null
          created_at: string
          first_name: string | null
          general_note: string | null
          id: string
          last_name: string | null
          marketing_consent_at: string | null
          marketing_consent_changed_at: string | null
          phone: string
          salutation: string | null
          service_consent_at: string | null
          service_consent_changed_at: string | null
        }
        Insert: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          first_name?: string | null
          general_note?: string | null
          id?: string
          last_name?: string | null
          marketing_consent_at?: string | null
          marketing_consent_changed_at?: string | null
          phone: string
          salutation?: string | null
          service_consent_at?: string | null
          service_consent_changed_at?: string | null
        }
        Update: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          first_name?: string | null
          general_note?: string | null
          id?: string
          last_name?: string | null
          marketing_consent_at?: string | null
          marketing_consent_changed_at?: string | null
          phone?: string
          salutation?: string | null
          service_consent_at?: string | null
          service_consent_changed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_labels: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      visit_notes: {
        Row: {
          appointment_id: string
          body: string
          created_at: string
          id: string
          patient_id: string
        }
        Insert: {
          appointment_id: string
          body: string
          created_at?: string
          id?: string
          patient_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          created_at?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      canonical_phone: { Args: { _phone: string }; Returns: string }
      claim_pending_messages: {
        Args: { _limit: number }
        Returns: {
          body: string
          id: string
          kind: string
          phone: string
        }[]
      }
      enqueue_visit_messages: {
        Args: { _appointment_id: string }
        Returns: undefined
      }
      get_busy_blocks: {
        Args: { _from: string; _to: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allowed_email: { Args: { _email: string }; Returns: boolean }
      render_message_body: {
        Args: {
          _kind: Database["public"]["Enums"]["message_kind"]
          _patient_id: string
          _starts_at: string
        }
        Returns: string
      }
      role_for_email: {
        Args: { _email: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "therapist" | "family"
      appointment_status: "scheduled" | "completed" | "cancelled"
      appointment_type: "patient_visit" | "family_event"
      marketing_reason: "anniversary" | "birthday"
      message_kind:
        | "reminder_24h"
        | "reminder_2h"
        | "confirmation"
        | "cancellation"
        | "marketing_anniversary"
        | "marketing_birthday"
      message_status: "pending" | "sent" | "failed"
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
      app_role: ["therapist", "family"],
      appointment_status: ["scheduled", "completed", "cancelled"],
      appointment_type: ["patient_visit", "family_event"],
      marketing_reason: ["anniversary", "birthday"],
      message_kind: [
        "reminder_24h",
        "reminder_2h",
        "confirmation",
        "cancellation",
        "marketing_anniversary",
        "marketing_birthday",
      ],
      message_status: ["pending", "sent", "failed"],
    },
  },
} as const
