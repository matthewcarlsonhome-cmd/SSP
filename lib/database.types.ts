// Database types for Supabase
// Generated based on the schema for community skills

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      skill_templates: {
        Row: {
          id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          long_description: string | null;
          category: string;
          estimated_time_saved: string | null;
          role_title: string | null;
          role_department: string | null;
          role_level: string | null;
          system_instruction: string;
          user_prompt_template: string;
          output_format: string;
          recommended_model: string;
          max_tokens: number;
          temperature: number;
          inputs: unknown[];
          use_count: number;
          rating_sum: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          long_description?: string | null;
          category: string;
          estimated_time_saved?: string | null;
          role_title?: string | null;
          role_department?: string | null;
          role_level?: string | null;
          system_instruction: string;
          user_prompt_template: string;
          output_format?: string;
          recommended_model?: string;
          max_tokens?: number;
          temperature?: number;
          inputs?: unknown[];
          use_count?: number;
          rating_sum?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          name?: string;
          description?: string | null;
          long_description?: string | null;
          category?: string;
          estimated_time_saved?: string | null;
          role_title?: string | null;
          role_department?: string | null;
          role_level?: string | null;
          system_instruction?: string;
          user_prompt_template?: string;
          output_format?: string;
          recommended_model?: string;
          max_tokens?: number;
          temperature?: number;
          inputs?: unknown[];
          use_count?: number;
          rating_sum?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
          is_public?: boolean;
        };
      };
      skill_tags: {
        Row: {
          id: string;
          skill_id: string;
          tag: string;
        };
        Insert: {
          id?: string;
          skill_id: string;
          tag: string;
        };
        Update: {
          id?: string;
          skill_id?: string;
          tag?: string;
        };
      };
      skill_ratings: {
        Row: {
          id: string;
          skill_id: string;
          user_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          skill_id: string;
          user_id: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          skill_id?: string;
          user_id?: string;
          rating?: number;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          company_name: string;
          industry: string;
          website: string | null;
          description: string | null;
          company_type: string | null;
          services: string | null;
          revenue: string | null;
          employee_count: string | null;
          location: string | null;
          priority: string | null;
          logo_url: string | null;
          linkedin_url: string | null;
          estimated_time_savings: string | null;
          estimated_cost_savings: string | null;
          pain_points: string | null;
          company_technical_info: string | null;
          key_use_cases: string[] | null;
          contacts: unknown;
          selected_skill_ids: string[] | null;
          selected_workflow_ids: string[] | null;
          custom_headline: string | null;
          custom_message: string | null;
          portal_slug: string;
          portal_enabled: boolean;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          last_contacted_at: string | null;
        };
        Insert: {
          id: string;
          company_name: string;
          industry?: string;
          website?: string | null;
          description?: string | null;
          company_type?: string | null;
          services?: string | null;
          revenue?: string | null;
          employee_count?: string | null;
          location?: string | null;
          priority?: string | null;
          logo_url?: string | null;
          linkedin_url?: string | null;
          estimated_time_savings?: string | null;
          estimated_cost_savings?: string | null;
          pain_points?: string | null;
          company_technical_info?: string | null;
          key_use_cases?: string[] | null;
          contacts?: unknown;
          selected_skill_ids?: string[] | null;
          selected_workflow_ids?: string[] | null;
          custom_headline?: string | null;
          custom_message?: string | null;
          portal_slug: string;
          portal_enabled?: boolean;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          last_contacted_at?: string | null;
        };
        Update: {
          id?: string;
          company_name?: string;
          industry?: string;
          website?: string | null;
          description?: string | null;
          company_type?: string | null;
          services?: string | null;
          revenue?: string | null;
          employee_count?: string | null;
          location?: string | null;
          priority?: string | null;
          logo_url?: string | null;
          linkedin_url?: string | null;
          estimated_time_savings?: string | null;
          estimated_cost_savings?: string | null;
          pain_points?: string | null;
          company_technical_info?: string | null;
          key_use_cases?: string[] | null;
          contacts?: unknown;
          selected_skill_ids?: string[] | null;
          selected_workflow_ids?: string[] | null;
          custom_headline?: string | null;
          custom_message?: string | null;
          portal_slug?: string;
          portal_enabled?: boolean;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          last_contacted_at?: string | null;
        };
      };
    };
    Functions: {
      increment_skill_use_count: {
        Args: { skill_id: string };
        Returns: void;
      };
    };
  };
}
