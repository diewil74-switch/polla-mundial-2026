'use client'

export function ScoreStepper({
  value,
  onChange,
  disabled,
  accentReal
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  accentReal?: boolean
}) {
  return (
    <div className={`stepper${disabled ? ' disabled' : ''}`}>
      <button
        type="button"
        onClick={() => !disabled && onChange(Math.max(0, value - 1))}
        disabled={disabled}
        aria-label="menos"
      >
        −
      </button>
      <span className={`sval num${accentReal ? ' real' : ''}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => !disabled && onChange(value + 1)}
        disabled={disabled}
        aria-label="más"
      >
        +
      </button>
    </div>
  )
}
