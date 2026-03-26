import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PatternPiece, HatParams } from '../types'
import { buildAllPiecesSvg } from '../lib/patternSvg'
import { tilePieces, PAPER_SIZES } from '../lib/printTile'

const THUMB_W = 280
const MM_TO_PX = 3.7795

interface Props {
  pieces: PatternPiece[]
  params: HatParams
  onParamsChange: (params: HatParams) => void
}

export function PatternView({ pieces, params, onParamsChange }: Props) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null)

  const paper = PAPER_SIZES[params.paperSize]
  const scale = THUMB_W / (paper.width * MM_TO_PX)
  const thumbH = Math.round(paper.height * MM_TO_PX * scale)

  const pages = useMemo(
    () => tilePieces(pieces, params.paperSize),
    [pieces, params.paperSize],
  )

  useEffect(() => {
    if (selectedPage !== null && selectedPage >= pages.length) {
      setSelectedPage(null)
    }
  }, [pages.length, selectedPage])

  useEffect(() => {
    if (selectedPage === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPage(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPage])

  const handleDownload = () => {
    const svg = buildAllPiecesSvg(pieces)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cadhatter-pattern.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head>
      <style>
        @page { size: ${params.paperSize === 'letter' ? '8.5in 11in' : 'A4'}; margin: 0; }
        body { margin: 0; }
        .page { page-break-after: always; width: 100%; }
        .page:last-child { page-break-after: auto; }
      </style>
    </head><body>
      ${pages.map(p => `<div class="page">${p}</div>`).join('')}
    </body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Gallery grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-6 justify-items-center">
          {pages.map((page, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setSelectedPage(i)}
                className="bg-white rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                style={{ width: THUMB_W, height: thumbH }}
                aria-label={`View page ${i + 1}`}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: Math.round(paper.width * MM_TO_PX),
                    height: Math.round(paper.height * MM_TO_PX),
                    pointerEvents: 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: page }}
                />
              </button>
              <span className="text-xs text-gray-500">Page {i + 1} of {pages.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full-size modal */}
      {selectedPage !== null && createPortal(
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setSelectedPage(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-[92vw] max-h-[92vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 sticky top-0 bg-white">
              <span className="text-sm font-medium text-gray-700">
                Page {selectedPage + 1} of {pages.length}
              </span>
              <button
                onClick={() => setSelectedPage(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4" dangerouslySetInnerHTML={{ __html: pages[selectedPage] }} />
          </div>
        </div>,
        document.body,
      )}

      {/* Footer: download + print + paper size */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
        >
          ⬇ Download SVG
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
        >
          🖨 Print
        </button>
        <div className="flex items-center gap-1.5 ml-auto text-sm text-gray-600">
          <span>Paper:</span>
          <select
            value={params.paperSize}
            onChange={e => onParamsChange({ ...params, paperSize: e.target.value as HatParams['paperSize'] })}
            className="border border-gray-300 rounded px-1.5 py-0.5 text-sm"
          >
            <option value="letter">Letter</option>
            <option value="a4">A4</option>
          </select>
        </div>
      </div>
    </div>
  )
}
