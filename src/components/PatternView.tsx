import type { PatternPiece, HatParams } from '../types'
import { buildPieceSvg, buildAllPiecesSvg } from '../lib/patternSvg'
import { tilePieces } from '../lib/printTile'

interface Props {
  pieces: PatternPiece[]
  params: HatParams
  onParamsChange: (params: HatParams) => void
}

export function PatternView({ pieces, params, onParamsChange }: Props) {
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
    const pages = tilePieces(pieces, params.paperSize)
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
      {/* Pattern pieces scroll area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-6 items-center">
        {pieces.map((piece, i) => (
          <div key={piece.id} className="bg-white rounded shadow-sm p-2">
            <div
              dangerouslySetInnerHTML={{
                __html: buildPieceSvg(piece, { calibrationSquare: i === 0 }),
              }}
            />
          </div>
        ))}
      </div>

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
