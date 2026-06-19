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
      advisors: {
        Row: {
          address: string | null
          created_at: string
          email: string
          faculty: string
          full_name: string
          id: string
          institute_id: string | null
          institute_participation_id: string | null
          phone: string | null
          position: string
          postal_code: string | null
          role: Database["public"]["Enums"]["advisor_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          faculty: string
          full_name: string
          id?: string
          institute_id?: string | null
          institute_participation_id?: string | null
          phone?: string | null
          position: string
          postal_code?: string | null
          role?: Database["public"]["Enums"]["advisor_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          faculty?: string
          full_name?: string
          id?: string
          institute_id?: string | null
          institute_participation_id?: string | null
          phone?: string | null
          position?: string
          postal_code?: string | null
          role?: Database["public"]["Enums"]["advisor_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes_tab"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_submissions: {
        Row: {
          campaign_name: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          note: string | null
          submitted_at: string
          submitted_by_email: string
          team_id: string
        }
        Insert: {
          campaign_name: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          note?: string | null
          submitted_at?: string
          submitted_by_email: string
          team_id: string
        }
        Update: {
          campaign_name?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          note?: string | null
          submitted_at?: string
          submitted_by_email?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "contest_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_team_members: {
        Row: {
          created_at: string
          id: string
          member_email: string
          member_name: string
          registration_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_email: string
          member_name: string
          registration_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_email?: string
          member_name?: string
          registration_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "contest_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_teams: {
        Row: {
          campaign_name: string
          concept: string
          created_at: string
          id: string
          institute_id: string
          leader_email: string
          leader_name: string
          leader_registration_id: string
          team_name: string
          updated_at: string
        }
        Insert: {
          campaign_name: string
          concept: string
          created_at?: string
          id?: string
          institute_id: string
          leader_email: string
          leader_name: string
          leader_registration_id: string
          team_name: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          concept?: string
          created_at?: string
          id?: string
          institute_id?: string
          leader_email?: string
          leader_name?: string
          leader_registration_id?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      institute_participations: {
        Row: {
          consent_at: string | null
          consent_given: boolean
          consent_text: string | null
          created_at: string
          id: string
          institute_id: string
          status: Database["public"]["Enums"]["institute_participation_status"]
          updated_at: string
        }
        Insert: {
          consent_at?: string | null
          consent_given?: boolean
          consent_text?: string | null
          created_at?: string
          id?: string
          institute_id: string
          status: Database["public"]["Enums"]["institute_participation_status"]
          updated_at?: string
        }
        Update: {
          consent_at?: string | null
          consent_given?: boolean
          consent_text?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          status?: Database["public"]["Enums"]["institute_participation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      institutes_tab: {
        Row: {
          coordinator_name: string | null
          created_at: string
          id: string
          institute: string
          link_url: string | null
          link_url_logo: string | null
          region: string
          start_semester: string | null
          updated_at: string
        }
        Insert: {
          coordinator_name?: string | null
          created_at?: string
          id?: string
          institute: string
          link_url?: string | null
          link_url_logo?: string | null
          region: string
          start_semester?: string | null
          updated_at?: string
        }
        Update: {
          coordinator_name?: string | null
          created_at?: string
          id?: string
          institute?: string
          link_url?: string | null
          link_url_logo?: string | null
          region?: string
          start_semester?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          organization: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          organization?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          organization?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registration_approvals: {
        Row: {
          advisor_id: string
          created_at: string
          decision: Database["public"]["Enums"]["advisor_vote"]
          id: string
          note: string | null
          registration_id: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          decision: Database["public"]["Enums"]["advisor_vote"]
          id?: string
          note?: string | null
          registration_id: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["advisor_vote"]
          id?: string
          note?: string | null
          registration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_approvals_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_approvals_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          advisor_email: string | null
          age: number | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by_advisor_id: string | null
          completion_status: Database["public"]["Enums"]["completion_status"]
          created_at: string
          education_level: string | null
          education_level_other: string | null
          field_of_study: string | null
          gender: string | null
          guest_email: string | null
          guest_name: string | null
          guest_organization: string | null
          guest_phone: string | null
          guest_position: string | null
          id: string
          institute_id: string | null
          notes: string | null
          participant_status: string | null
          participant_status_other: string | null
          pdpa_consent: boolean
          pdpa_consent_at: string | null
          pdpa_consent_text: string | null
          status: string
          training_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advisor_email?: string | null
          age?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by_advisor_id?: string | null
          completion_status?: Database["public"]["Enums"]["completion_status"]
          created_at?: string
          education_level?: string | null
          education_level_other?: string | null
          field_of_study?: string | null
          gender?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_organization?: string | null
          guest_phone?: string | null
          guest_position?: string | null
          id?: string
          institute_id?: string | null
          notes?: string | null
          participant_status?: string | null
          participant_status_other?: string | null
          pdpa_consent?: boolean
          pdpa_consent_at?: string | null
          pdpa_consent_text?: string | null
          status?: string
          training_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advisor_email?: string | null
          age?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by_advisor_id?: string | null
          completion_status?: Database["public"]["Enums"]["completion_status"]
          created_at?: string
          education_level?: string | null
          education_level_other?: string | null
          field_of_study?: string | null
          gender?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_organization?: string | null
          guest_phone?: string | null
          guest_position?: string | null
          id?: string
          institute_id?: string | null
          notes?: string | null
          participant_status?: string | null
          participant_status_other?: string | null
          pdpa_consent?: boolean
          pdpa_consent_at?: string | null
          pdpa_consent_text?: string | null
          status?: string
          training_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_approved_by_advisor_id_fkey"
            columns: ["approved_by_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes_tab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
          question_id: string
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
          question_id: string
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
          question_id?: string
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "survey_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_invitations: {
        Row: {
          age_range: string | null
          created_at: string
          education: string | null
          gender: string | null
          id: string
          invited_at: string
          recipient_email: string
          recipient_name: string | null
          registration_id: string | null
          submitted_at: string | null
          suggestions: string | null
          survey_id: string
          token: string
          training_id: string | null
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          invited_at?: string
          recipient_email: string
          recipient_name?: string | null
          registration_id?: string | null
          submitted_at?: string | null
          suggestions?: string | null
          survey_id: string
          token: string
          training_id?: string | null
        }
        Update: {
          age_range?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          invited_at?: string
          recipient_email?: string
          recipient_name?: string | null
          registration_id?: string | null
          submitted_at?: string | null
          suggestions?: string | null
          survey_id?: string
          token?: string
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_invitations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          options: Json | null
          position: number
          question_type: Database["public"]["Enums"]["survey_question_type"]
          rating_max: number | null
          required: boolean
          survey_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          options?: Json | null
          position?: number
          question_type: Database["public"]["Enums"]["survey_question_type"]
          rating_max?: number | null
          required?: boolean
          survey_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          options?: Json | null
          position?: number
          question_type?: Database["public"]["Enums"]["survey_question_type"]
          rating_max?: number | null
          required?: boolean
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          age_range: string | null
          created_at: string
          education: string | null
          gender: string | null
          id: string
          invited_at: string
          rating_application: number | null
          rating_assistant: number | null
          rating_duration: number | null
          rating_equipment: number | null
          rating_instructor: number | null
          rating_knowledge: number | null
          rating_materials: number | null
          rating_venue: number | null
          recipient_email: string
          recipient_name: string | null
          registration_id: string | null
          submitted_at: string | null
          suggestions: string | null
          token: string
          training_id: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          invited_at?: string
          rating_application?: number | null
          rating_assistant?: number | null
          rating_duration?: number | null
          rating_equipment?: number | null
          rating_instructor?: number | null
          rating_knowledge?: number | null
          rating_materials?: number | null
          rating_venue?: number | null
          recipient_email: string
          recipient_name?: string | null
          registration_id?: string | null
          submitted_at?: string | null
          suggestions?: string | null
          token: string
          training_id: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          invited_at?: string
          rating_application?: number | null
          rating_assistant?: number | null
          rating_duration?: number | null
          rating_equipment?: number | null
          rating_instructor?: number | null
          rating_knowledge?: number | null
          rating_materials?: number | null
          rating_venue?: number | null
          recipient_email?: string
          recipient_name?: string | null
          registration_id?: string | null
          submitted_at?: string | null
          suggestions?: string | null
          token?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          collect_demographics: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          collect_demographics?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          collect_demographics?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainings: {
        Row: {
          attachment_1_name: string | null
          attachment_1_url: string | null
          attachment_2_name: string | null
          attachment_2_url: string | null
          attachment_3_name: string | null
          attachment_3_url: string | null
          capacity: number
          category: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          id: string
          instructor: string | null
          is_published: boolean
          location: string | null
          prerequisite_training_id: string | null
          registration_deadline: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_1_name?: string | null
          attachment_1_url?: string | null
          attachment_2_name?: string | null
          attachment_2_url?: string | null
          attachment_3_name?: string | null
          attachment_3_url?: string | null
          capacity?: number
          category?: string | null
          course_type?: Database["public"]["Enums"]["course_type"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date: string
          id?: string
          instructor?: string | null
          is_published?: boolean
          location?: string | null
          prerequisite_training_id?: string | null
          registration_deadline?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_1_name?: string | null
          attachment_1_url?: string | null
          attachment_2_name?: string | null
          attachment_2_url?: string | null
          attachment_3_name?: string | null
          attachment_3_url?: string | null
          capacity?: number
          category?: string | null
          course_type?: Database["public"]["Enums"]["course_type"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          id?: string
          instructor?: string | null
          is_published?: boolean
          location?: string | null
          prerequisite_training_id?: string | null
          registration_deadline?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_prerequisite_training_id_fkey"
            columns: ["prerequisite_training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
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
      advisor_can_handle_registration: {
        Args: { _email: string; _registration_id: string }
        Returns: boolean
      }
      advisor_in_registration_institute: {
        Args: { _email: string; _registration_id: string }
        Returns: boolean
      }
      current_advisor_institute_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_institute_join_participation_id: {
        Args: { _institute_id: string }
        Returns: string
      }
      has_completed_any_core: { Args: { _user_id: string }; Returns: boolean }
      has_completed_training: {
        Args: { _training_id: string; _user_id: string }
        Returns: boolean
      }
      has_registered_any_core: { Args: { _user_id: string }; Returns: boolean }
      has_registered_training: {
        Args: { _training_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      institute_has_main_advisor: {
        Args: { _institute_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      public_registrations_count: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      advisor_role: "main" | "assistant"
      advisor_vote: "approve" | "reject"
      app_role: "admin" | "user" | "advisor" | "student"
      approval_status: "pending" | "approved" | "rejected"
      completion_status: "enrolled" | "completed" | "failed"
      course_type: "core" | "elective"
      institute_participation_status: "join" | "decline"
      survey_question_type:
        | "rating"
        | "single_choice"
        | "multi_choice"
        | "short_text"
        | "long_text"
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
      advisor_role: ["main", "assistant"],
      advisor_vote: ["approve", "reject"],
      app_role: ["admin", "user", "advisor", "student"],
      approval_status: ["pending", "approved", "rejected"],
      completion_status: ["enrolled", "completed", "failed"],
      course_type: ["core", "elective"],
      institute_participation_status: ["join", "decline"],
      survey_question_type: [
        "rating",
        "single_choice",
        "multi_choice",
        "short_text",
        "long_text",
      ],
    },
  },
} as const
