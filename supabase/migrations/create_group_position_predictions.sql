-- Create table for manual group position predictions
CREATE TABLE IF NOT EXISTS group_position_predictions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  predicted_position INTEGER NOT NULL CHECK (predicted_position >= 1 AND predicted_position <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id, team_id),
  UNIQUE(user_id, group_id, predicted_position)
);

-- Enable RLS
ALTER TABLE group_position_predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own predictions
CREATE POLICY "Users can view own group position predictions"
  ON group_position_predictions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own predictions
CREATE POLICY "Users can insert own group position predictions"
  ON group_position_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own predictions
CREATE POLICY "Users can update own group position predictions"
  ON group_position_predictions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own predictions
CREATE POLICY "Users can delete own group position predictions"
  ON group_position_predictions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all predictions (needed to recalculate bonuses for all users)
CREATE POLICY "Admins can view all group position predictions"
  ON group_position_predictions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add index for faster queries
CREATE INDEX idx_group_position_predictions_user_group ON group_position_predictions(user_id, group_id);
