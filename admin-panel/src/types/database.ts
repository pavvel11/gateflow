export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation: string
          performed_at: string
          performed_by: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          performed_at?: string
          performed_by?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          performed_at?: string
          performed_by?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      consent_logs: {
        Row: {
          anonymous_id: string | null
          consent_version: string | null
          consents: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          consent_version?: string | null
          consents?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          consent_version?: string | null
          consents?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          customer_email: string
          discount_amount: number
          id: string
          redeemed_at: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          customer_email: string
          discount_amount: number
          id?: string
          redeemed_at?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          customer_email?: string
          discount_amount?: number
          id?: string
          redeemed_at?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coupons: {
        Row: {
          allowed_emails: Json
          allowed_product_ids: Json
          code: string
          created_at: string
          currency: string | null
          current_usage_count: number
          discount_type: string
          discount_value: number
          exclude_order_bumps: boolean
          expires_at: string | null
          id: string
          is_active: boolean
          name: string | null
          starts_at: string
          updated_at: string
          usage_limit_global: number | null
          usage_limit_per_user: number | null
        }
        Insert: {
          allowed_emails?: Json
          allowed_product_ids?: Json
          code: string
          created_at?: string
          currency?: string | null
          current_usage_count?: number
          discount_type: string
          discount_value: number
          exclude_order_bumps?: boolean
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          starts_at?: string
          updated_at?: string
          usage_limit_global?: number | null
          usage_limit_per_user?: number | null
        }
        Update: {
          allowed_emails?: Json
          allowed_product_ids?: Json
          code?: string
          created_at?: string
          currency?: string | null
          current_usage_count?: number
          discount_type?: string
          discount_value?: number
          exclude_order_bumps?: boolean
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          starts_at?: string
          updated_at?: string
          usage_limit_global?: number | null
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
      guest_purchases: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          customer_email: string
          id: string
          product_id: string
          session_id: string
          transaction_amount: number
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          customer_email: string
          id?: string
          product_id: string
          session_id: string
          transaction_amount: number
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          customer_email?: string
          id?: string
          product_id?: string
          session_id?: string
          transaction_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_purchases_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guest_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations_config: {
        Row: {
          consent_logging_enabled: boolean | null
          cookie_consent_enabled: boolean | null
          created_at: string | null
          custom_body_code: string | null
          custom_head_code: string | null
          facebook_capi_token: string | null
          facebook_pixel_id: string | null
          facebook_test_event_code: string | null
          google_ads_conversion_id: string | null
          google_ads_conversion_label: string | null
          gtm_container_id: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          consent_logging_enabled?: boolean | null
          cookie_consent_enabled?: boolean | null
          created_at?: string | null
          custom_body_code?: string | null
          custom_head_code?: string | null
          facebook_capi_token?: string | null
          facebook_pixel_id?: string | null
          facebook_test_event_code?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          gtm_container_id?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          consent_logging_enabled?: boolean | null
          cookie_consent_enabled?: boolean | null
          created_at?: string | null
          custom_body_code?: string | null
          custom_head_code?: string | null
          facebook_capi_token?: string | null
          facebook_pixel_id?: string | null
          facebook_test_event_code?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          gtm_container_id?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      order_bumps: {
        Row: {
          access_duration_days: number | null
          bump_description: string | null
          bump_price: number | null
          bump_product_id: string
          bump_title: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          main_product_id: string
          updated_at: string
        }
        Insert: {
          access_duration_days?: number | null
          bump_description?: string | null
          bump_price?: number | null
          bump_product_id: string
          bump_title: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          main_product_id: string
          updated_at?: string
        }
        Update: {
          access_duration_days?: number | null
          bump_description?: string | null
          bump_price?: number | null
          bump_product_id?: string
          bump_title?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          main_product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_main_product_id_fkey"
            columns: ["main_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          id: string
          metadata: Json
          product_id: string
          refund_reason: string | null
          refunded_amount: number | null
          refunded_at: string | null
          refunded_by: string | null
          session_id: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          customer_email: string
          id?: string
          metadata?: Json
          product_id: string
          refund_reason?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          refunded_by?: string | null
          session_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          id?: string
          metadata?: Json
          product_id?: string
          refund_reason?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          refunded_by?: string | null
          session_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          auto_grant_duration_days: number | null
          available_from: string | null
          available_until: string | null
          content_config: Json
          content_delivery_type: string
          created_at: string
          currency: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          layout_template: string
          name: string
          pass_params_to_redirect: boolean
          price: number
          slug: string
          success_redirect_url: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          auto_grant_duration_days?: number | null
          available_from?: string | null
          available_until?: string | null
          content_config?: Json
          content_delivery_type?: string
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          layout_template?: string
          name: string
          pass_params_to_redirect?: boolean
          price?: number
          slug: string
          success_redirect_url?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_grant_duration_days?: number | null
          available_from?: string | null
          available_until?: string | null
          content_config?: Json
          content_delivery_type?: string
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          layout_template?: string
          name?: string
          pass_params_to_redirect?: boolean
          price?: number
          slug?: string
          success_redirect_url?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          preferred_language: string | null
          state: string | null
          tax_id: string | null
          timezone: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          preferred_language?: string | null
          state?: string | null
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          preferred_language?: string | null
          state?: string | null
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          call_count: number
          created_at: string
          function_name: string
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          call_count?: number
          created_at?: string
          function_name: string
          updated_at?: string
          user_id: string
          window_start: string
        }
        Update: {
          call_count?: number
          created_at?: string
          function_name?: string
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      user_product_access: {
        Row: {
          access_duration_days: number | null
          access_expires_at: string | null
          access_granted_at: string
          created_at: string
          id: string
          product_id: string
          tenant_id: string | null
          user_id: string
          version: number
        }
        Insert: {
          access_duration_days?: number | null
          access_expires_at?: string | null
          access_granted_at?: string
          created_at?: string
          id?: string
          product_id: string
          tenant_id?: string | null
          user_id: string
          version?: number
        }
        Update: {
          access_duration_days?: number | null
          access_expires_at?: string | null
          access_granted_at?: string
          created_at?: string
          id?: string
          product_id?: string
          tenant_id?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_product_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      video_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          position_seconds: number
          progress_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          position_seconds: number
          progress_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          position_seconds?: number
          progress_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_events_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "video_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          last_position_seconds: number
          max_position_seconds: number
          product_id: string
          updated_at: string
          user_id: string
          video_duration_seconds: number | null
          video_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          last_position_seconds?: number
          max_position_seconds?: number
          product_id: string
          updated_at?: string
          user_id: string
          video_duration_seconds?: number | null
          video_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          last_position_seconds?: number
          max_position_seconds?: number
          product_id?: string
          updated_at?: string
          user_id?: string
          video_duration_seconds?: number | null
          video_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          description: string | null
          events: string[]
          id: string
          is_active: boolean | null
          secret: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          endpoint_id: string | null
          error_message: string | null
          event_type: string
          http_status: number | null
          id: string
          payload: Json | null
          response_body: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint_id?: string | null
          error_message?: string | null
          event_type: string
          http_status?: number | null
          id?: string
          payload?: Json | null
          response_body?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint_id?: string | null
          error_message?: string | null
          event_type?: string
          http_status?: number | null
          id?: string
          payload?: Json | null
          response_body?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payment_system_health: {
        Row: {
          avg_transaction_amount: number | null
          completed_transactions: number | null
          disputed_transactions: number | null
          records_last_24h: number | null
          refunded_transactions: number | null
          snapshot_time: string | null
          table_name: string | null
          total_records: number | null
        }
        Relationships: []
      }
      rate_limit_summary: {
        Row: {
          avg_calls_per_user: number | null
          function_name: string | null
          last_activity: string | null
          max_calls_per_user: number | null
          total_calls: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      user_access_stats: {
        Row: {
          email: string | null
          email_confirmed_at: string | null
          first_access_granted_at: string | null
          last_access_granted_at: string | null
          last_sign_in_at: string | null
          raw_user_meta_data: Json | null
          total_products: number | null
          total_value: number | null
          user_created_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_product_access_detailed: {
        Row: {
          access_created_at: string | null
          access_duration_days: number | null
          access_expires_at: string | null
          access_granted_at: string | null
          id: string | null
          product_created_at: string | null
          product_currency: string | null
          product_description: string | null
          product_icon: string | null
          product_id: string | null
          product_is_active: boolean | null
          product_name: string | null
          product_price: number | null
          product_slug: string | null
          product_updated_at: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_product_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_product_order_bumps: {
        Args: { product_id_param: string }
        Returns: {
          access_duration_days: number
          bump_description: string
          bump_id: string
          bump_price: number
          bump_product_id: string
          bump_product_name: string
          bump_title: string
          created_at: string
          display_order: number
          is_active: boolean
          updated_at: string
        }[]
      }
      batch_check_user_product_access: {
        Args: { product_slugs_param: string[] }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          function_name_param: string
          max_calls?: number
          time_window_seconds?: number
        }
        Returns: boolean
      }
      check_user_product_access: {
        Args: { product_slug_param: string }
        Returns: boolean
      }
      claim_guest_purchases_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_audit_logs: { Args: { retention_days?: number }; Returns: number }
      cleanup_old_admin_actions: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_guest_purchases: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_rate_limits: {
        Args: { retention_hours?: number }
        Returns: number
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      clear_admin_cache: { Args: never; Returns: undefined }
      find_auto_apply_coupon: {
        Args: { customer_email_param: string; product_id_param: string }
        Returns: Json
      }
      get_cleanup_job_status: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobname: string
          last_run: string
          schedule: string
        }[]
      }
      get_payment_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      get_product_order_bumps: {
        Args: { product_id_param: string }
        Returns: {
          bump_access_duration: number
          bump_currency: string
          bump_description: string
          bump_id: string
          bump_price: number
          bump_product_description: string
          bump_product_icon: string
          bump_product_id: string
          bump_product_name: string
          bump_title: string
          display_order: number
          original_price: number
        }[]
      }
      get_public_integrations_config: {
        Args: never
        Returns: {
          consent_logging_enabled: boolean
          cookie_consent_enabled: boolean
          custom_body_code: string
          custom_head_code: string
          facebook_pixel_id: string
          gtm_container_id: string
        }[]
      }
      get_user_payment_history: {
        Args: { user_id_param: string }
        Returns: {
          amount: number
          currency: string
          payment_date: string
          product_name: string
          product_slug: string
          refunded_amount: number
          status: string
          transaction_id: string
        }[]
      }
      get_user_profile: { Args: { user_id_param: string }; Returns: Json }
      grant_free_product_access: {
        Args: {
          access_duration_days_param?: number
          product_slug_param: string
        }
        Returns: boolean
      }
      grant_product_access_service_role: {
        Args: {
          max_retries?: number
          product_id_param: string
          user_id_param: string
        }
        Returns: Json
      }
      is_admin: { Args: { user_id_param?: string }; Returns: boolean }
      is_admin_cached: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          action_details?: Json
          action_name: string
          target_id: string
          target_type: string
        }
        Returns: undefined
      }
      log_audit_entry: {
        Args: {
          new_values_param?: Json
          old_values_param?: Json
          operation_param: string
          table_name_param: string
          user_id_param?: string
        }
        Returns: undefined
      }
      logs_monitoring_check: {
        Args: { new_action_details?: Json }
        Returns: undefined
      }
      process_stripe_payment_completion: {
        Args: {
          amount_total: number
          currency_param: string
          customer_email_param: string
          product_id_param: string
          session_id_param: string
          stripe_payment_intent_id?: string
          user_id_param?: string
        }
        Returns: Json
      }
      process_stripe_payment_completion_with_bump: {
        Args: {
          amount_total: number
          bump_product_id_param?: string
          coupon_id_param?: string
          currency_param: string
          customer_email_param: string
          product_id_param: string
          session_id_param: string
          stripe_payment_intent_id?: string
          user_id_param?: string
        }
        Returns: Json
      }
      send_monitoring_email: {
        Args: { alert_details: Json; alert_type: string }
        Returns: undefined
      }
      update_video_progress: {
        Args: {
          completed_param?: boolean
          duration_param?: number
          position_param: number
          product_id_param: string
          video_id_param: string
        }
        Returns: Json
      }
      validate_email_format: { Args: { email_param: string }; Returns: boolean }
      validate_payment_transaction: {
        Args: { transaction_id: string }
        Returns: boolean
      }
      verify_coupon: {
        Args: {
          code_param: string
          currency_param?: string
          customer_email_param?: string
          product_id_param: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

