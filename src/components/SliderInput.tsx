import { useState, useEffect } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

export function SliderInput({ label, value, min, max, step, unit, onChange }: Props) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value)
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) onChange(v)
  }

  const handleBlur = () => {
    const v = parseFloat(draft)
    if (isNaN(v)) { onChange(min); return }
    onChange(Math.min(max, Math.max(min, v)))
  }

  return (
    <div className="flex flex-col gap-1 mb-3">
      <div className="flex justify-between items-baseline">
        <label className="text-sm text-gray-700">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={draft}
            min={min}
            max={max}
            step={step}
            onChange={handleNumber}
            onBlur={handleBlur}
            className="w-16 text-right text-sm border border-gray-300 rounded px-1 py-0.5"
          />
          <span className="text-xs text-gray-500 w-6">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-gray-800"
      />
    </div>
  )
}
