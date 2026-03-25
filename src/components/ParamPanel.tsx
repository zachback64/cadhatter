import type { HatParams } from '../types'
import { SliderInput } from './SliderInput'

const CM = 0.1  // multiply mm by this to display cm
const IN = 1 / 25.4

interface Props {
  params: HatParams
  onChange: (params: HatParams) => void
}

export function ParamPanel({ params, onChange }: Props) {
  const u = params.units
  const scale = u === 'cm' ? CM : IN
  const unitLabel = u === 'cm' ? 'cm' : 'in'
  const toDisplay = (mm: number) => parseFloat((mm * scale).toFixed(2))
  const toMm = (display: number) => display / scale

  const set = <K extends keyof HatParams>(key: K, val: HatParams[K]) =>
    onChange({ ...params, [key]: val })

  return (
    <div className="w-56 shrink-0 border-r border-gray-200 p-4 overflow-y-auto bg-white">
      <SliderInput
        label="Head circumference"
        value={toDisplay(params.headCircumference)}
        min={u === 'cm' ? 40 : 15.7} max={u === 'cm' ? 70 : 27.6} step={u === 'cm' ? 0.5 : 0.25}
        unit={unitLabel}
        onChange={v => set('headCircumference', toMm(v))}
      />
      <SliderInput
        label="Hat height"
        value={toDisplay(params.hatHeight)}
        min={u === 'cm' ? 5 : 2} max={u === 'cm' ? 20 : 7.9} step={u === 'cm' ? 0.5 : 0.25}
        unit={unitLabel}
        onChange={v => set('hatHeight', toMm(v))}
      />
      <SliderInput
        label="Hat taper"
        value={params.taperAngle}
        min={0} max={30} step={0.5}
        unit="°"
        onChange={v => set('taperAngle', v)}
      />
      <SliderInput
        label="Brim width"
        value={toDisplay(params.brimWidth)}
        min={u === 'cm' ? 2 : 0.8} max={u === 'cm' ? 15 : 5.9} step={u === 'cm' ? 0.5 : 0.25}
        unit={unitLabel}
        onChange={v => set('brimWidth', toMm(v))}
      />
      <SliderInput
        label="Brim angle"
        value={params.brimAngle}
        min={0} max={30} step={0.5}
        unit="°"
        onChange={v => set('brimAngle', v)}
      />
      <SliderInput
        label="Seam allowance"
        value={toDisplay(params.seamAllowance)}
        min={0} max={u === 'cm' ? 3 : 1.2} step={u === 'cm' ? 0.1 : 0.05}
        unit={unitLabel}
        onChange={v => set('seamAllowance', toMm(v))}
      />

      <div className="mb-3">
        <label className="text-sm text-gray-700 block mb-1">Side gores</label>
        <select
          value={params.goreCount}
          onChange={e => set('goreCount', parseInt(e.target.value) as HatParams['goreCount'])}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {([1, 4, 6, 8] as const).map(n => (
            <option key={n} value={n}>{n === 1 ? '1 (place on fold)' : n}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={params.showNotches}
          onChange={e => set('showNotches', e.target.checked)}
          className="accent-gray-800"
        />
        Show notches
      </label>
    </div>
  )
}
