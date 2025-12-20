-- Video Views and Progress Tracking System
-- Migration: 20251128141050_video_views_tracking
-- Description: Infrastructure for tracking video engagement and user progress

BEGIN;

-- =============================================================================
-- VIDEO PROGRESS TABLE
-- =============================================================================

-- Tracks individual user progress for each video/product
CREATE TABLE IF NOT EXISTS public.video_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  
  -- Video identifier (useful if product has multiple videos in the future)
  video_id TEXT NOT NULL, 
  
  -- Progress data
  last_position_seconds INTEGER DEFAULT 0 NOT NULL,
  max_position_seconds INTEGER DEFAULT 0 NOT NULL,
  video_duration_seconds INTEGER,
  
  -- Status
  is_completed BOOLEAN DEFAULT false NOT NULL,
  view_count INTEGER DEFAULT 1 NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT unique_user_video_progress UNIQUE (user_id, product_id, video_id)
);

-- =============================================================================
-- VIDEO ENGAGEMENT EVENTS (Raw Data for Heatmaps)
-- =============================================================================

-- Stores raw interaction events for deep analytics
CREATE TABLE IF NOT EXISTS public.video_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  progress_id UUID REFERENCES public.video_progress(id) ON DELETE CASCADE NOT NULL,
  
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'heartbeat', 'complete')),
  position_seconds INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_product ON video_progress(product_id);
CREATE INDEX IF NOT EXISTS idx_video_events_progress ON video_events(progress_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_events ENABLE ROW LEVEL SECURITY;

-- Users can manage their own progress
CREATE POLICY "Users can view own video progress" ON video_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video progress" ON video_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video progress" ON video_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Events follow progress ownership
CREATE POLICY "Users can view own video events" ON video_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_progress 
      WHERE video_progress.id = video_events.progress_id 
      AND video_progress.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own video events" ON video_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_progress 
      WHERE video_progress.id = video_events.progress_id 
      AND video_progress.user_id = auth.uid()
    )
  );

-- Admins can view everything for analytics
CREATE POLICY "Admins can view all video progress" ON video_progress
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all video events" ON video_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- Securely update or create video progress
CREATE OR REPLACE FUNCTION public.update_video_progress(
  product_id_param UUID,
  video_id_param TEXT,
  position_param INTEGER,
  duration_param INTEGER DEFAULT NULL,
  completed_param BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  progress_record RECORD;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Upsert progress
  INSERT INTO public.video_progress (
    user_id, product_id, video_id, last_position_seconds, max_position_seconds, video_duration_seconds, is_completed
  ) VALUES (
    current_user_id, product_id_param, video_id_param, position_param, position_param, duration_param, completed_param
  )
  ON CONFLICT (user_id, product_id, video_id) DO UPDATE SET
    last_position_seconds = position_param,
    max_position_seconds = GREATEST(video_progress.max_position_seconds, position_param),
    video_duration_seconds = COALESCE(duration_param, video_progress.video_duration_seconds),
    is_completed = video_progress.is_completed OR completed_param,
    view_count = video_progress.view_count + CASE WHEN position_param = 0 THEN 1 ELSE 0 END,
    updated_at = NOW()
  RETURNING * INTO progress_record;

  RETURN jsonb_build_object(
    'success', true,
    'id', progress_record.id,
    'last_position', progress_record.last_position_seconds,
    'is_completed', progress_record.is_completed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_progress_updated_at
  BEFORE UPDATE ON video_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
