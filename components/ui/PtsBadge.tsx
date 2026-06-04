function heatLevel(pts: number | null): number | null {
  if (pts == null) return null
  if (pts >= 8) return 4   // exacto único
  if (pts >= 3) return 3   // exacto
  if (pts >= 2) return 2   // resultado correcto
  if (pts >= 1) return 1   // parcial
  return 0
}

export function PtsBadge({ pts }: { pts: number | null }) {
  if (pts == null) return <span className="pts-badge pending">pendiente</span>

  const lvl = heatLevel(pts)
  return <span className={`pts-badge h${lvl}`}>{pts > 0 ? '+' + pts : '0'} pts</span>
}
