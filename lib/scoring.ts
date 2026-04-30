// Scoring logic for Polla Mundial 2026

type Match = {
  id: number
  phase: string
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  home_team_id: number | null
  away_team_id: number | null
}

type Prediction = {
  pred_home: number
  pred_away: number
}

/**
 * Calculate points for a group stage match prediction
 * Points are CUMULATIVE:
 * - Exact score: 3 pts
 * - Each correct goal: 1 pt (2 pts total if both)
 * - Correct winner/draw: 2 pts
 * Example: Exact score 2-1 = 3 + 1 + 1 + 2 = 7 pts
 */
export function calculateGroupStagePoints(
  match: Match,
  prediction: Prediction
): number {
  if (match.home_score === null || match.away_score === null) {
    return 0
  }

  const { home_score, away_score } = match
  const { pred_home, pred_away } = prediction

  let points = 0

  // 1. Exact score: 3 points
  if (pred_home === home_score && pred_away === away_score) {
    points += 3
  }

  // 2. Correct goals: 1 point per correct goal
  if (pred_home === home_score) {
    points += 1
  }
  if (pred_away === away_score) {
    points += 1
  }

  // 3. Correct winner or draw: 2 points
  const actualResult =
    home_score > away_score ? 'home' : home_score < away_score ? 'away' : 'draw'
  const predictedResult =
    pred_home > pred_away ? 'home' : pred_home < pred_away ? 'away' : 'draw'

  if (actualResult === predictedResult) {
    points += 2
  }

  return points
}

/**
 * Calculate points for an elimination round match prediction
 * Note: Scores include extra time (120 min) if applicable
 * Points are CUMULATIVE:
 * - Correct qualifier: 3 pts
 * - Exact score: 3 pts
 * - Each correct goal: 1 pt (2 pts total if both)
 */
export function calculateEliminationPoints(
  match: Match,
  prediction: Prediction
): number {
  if (match.home_score === null || match.away_score === null) {
    return 0
  }

  let points = 0

  // Predicted winner (who advances)
  const predictedWinner =
    prediction.pred_home > prediction.pred_away
      ? match.home_team_id
      : match.away_team_id

  // Correct qualifier: 3 points
  if (predictedWinner === match.winner_team_id) {
    points += 3
  }

  // Exact score in 120 min: +3 points
  if (
    prediction.pred_home === match.home_score &&
    prediction.pred_away === match.away_score
  ) {
    points += 3
  }

  // Correct goals: 1 point per correct goal
  if (prediction.pred_home === match.home_score) {
    points += 1
  }
  if (prediction.pred_away === match.away_score) {
    points += 1
  }

  return points
}

/**
 * Calculate points for a match based on phase
 */
export function calculateMatchPoints(
  match: Match,
  prediction: Prediction
): number {
  if (match.phase === 'groups') {
    return calculateGroupStagePoints(match, prediction)
  } else {
    return calculateEliminationPoints(match, prediction)
  }
}
