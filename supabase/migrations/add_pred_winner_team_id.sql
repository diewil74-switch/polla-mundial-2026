-- Add pred_winner_team_id to predictions for elimination draw predictions
-- Allows users to explicitly pick who they think advances when predicting a draw

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS pred_winner_team_id INTEGER REFERENCES teams(id);
