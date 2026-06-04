// Componente de bandera emoji
export function Flag({ emoji, name, size = 18 }: { emoji: string; name?: string; size?: number }) {
  return (
    <span
      className="flag"
      style={{ fontSize: size, lineHeight: 1 }}
      title={name}
    >
      {emoji}
    </span>
  )
}
