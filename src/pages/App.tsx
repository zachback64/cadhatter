import { useState, useRef, useEffect } from 'react'
import { DEFAULT_PARAMS } from '../types'
import type { HatParams } from '../types'
import { computeHat } from '../lib/hatMath'
import { ParamPanel } from '../components/ParamPanel'
import { HatScene } from '../components/HatScene'
import { PatternView } from '../components/PatternView'

type Tab = '3d' | 'pattern'

export const SWATCHES = [
  { name: 'Natural',  hex: '#f0ece4' },
  { name: 'Navy',     hex: '#1e3a5f' },
  { name: 'Black',    hex: '#1a1a1a' },
  { name: 'Olive',    hex: '#6b7c45' },
  { name: 'Burgundy', hex: '#6e1c2e' },
  { name: 'Sand',     hex: '#c8a96e' },
] as const

export function AppPage() {
  const [params, setParams] = useState<HatParams>(DEFAULT_PARAMS)
  const [tab, setTab] = useState<Tab>('3d')
  const [fabricUrl, setFabricUrl] = useState<string | null>(null)
  const [hatColor, setHatColor] = useState(SWATCHES[0].hex)
  const [showHead, setShowHead] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fabricUrlRef = useRef<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fabricUrlRef.current) URL.revokeObjectURL(fabricUrlRef.current)
    const url = URL.createObjectURL(file)
    fabricUrlRef.current = url
    setFabricUrl(url)
  }

  const handleRemoveFabric = () => {
    if (fabricUrlRef.current) {
      URL.revokeObjectURL(fabricUrlRef.current)
      fabricUrlRef.current = null
    }
    setFabricUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    return () => { if (fabricUrlRef.current) URL.revokeObjectURL(fabricUrlRef.current) }
  }, [])

  const geo = computeHat(params)

  const handleUnitToggle = () => {
    setParams(p => ({ ...p, units: p.units === 'cm' ? 'in' : 'cm' }))
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <a href="/" className="text-lg font-semibold tracking-tight text-gray-900">cadhatter</a>
        <button
          onClick={handleUnitToggle}
          className="text-sm border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
        >
          {params.units === 'cm' ? 'cm → in' : 'in → cm'}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: params */}
        <ParamPanel params={params} onChange={setParams} />

        {/* Right: tabs */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 bg-white px-4">
            {(['3d', 'pattern'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === '3d' ? '3D View' : 'Pattern'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {tab === '3d' ? (
              <div className="relative h-full">
                <HatScene params={params} fabricUrl={fabricUrl ?? undefined} hatColor={hatColor} showHead={showHead} />
                <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                  {fabricUrl ? (
                    <button
                      onClick={handleRemoveFabric}
                      className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
                    >
                      ✕ Remove fabric
                    </button>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
                    >
                      Upload fabric
                    </button>
                  )}
                  <button
                    onClick={() => setShowHead(h => !h)}
                    className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
                  >
                    {showHead ? 'Hide head' : 'Show head'}
                  </button>
                </div>

                {/* Color swatch bar */}
                <div
                  data-testid="swatch-bar"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm"
                  style={fabricUrl ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
                >
                  {SWATCHES.map(s => (
                    <button
                      key={s.hex}
                      title={s.name}
                      onClick={() => setHatColor(s.hex)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: s.hex,
                        borderColor: hatColor === s.hex ? '#374151' : 'transparent',
                        outline: hatColor === s.hex ? '2px solid white' : 'none',
                        outlineOffset: '-3px',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={hatColor}
                    onChange={e => setHatColor(e.target.value)}
                    title="Custom color"
                    className="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform"
                    style={{ padding: 0 }}
                  />
                </div>
              </div>
            ) : (
              <PatternView pieces={geo.patternPieces} params={params} onParamsChange={setParams} />
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
