import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Fully parametric',
    desc: 'Adjust head circumference, height, taper, brim width, brim angle, and gore count.',
  },
  {
    title: 'Live 3D preview',
    desc: 'See your hat update in real time as you move the sliders. Drag to rotate.',
  },
  {
    title: 'Print-ready patterns',
    desc: 'Patterns tile across letter or A4 paper with overlap marks. Includes a calibration square.',
  },
  {
    title: 'Custom seam allowance',
    desc: 'Set your seam allowance once — cut lines and sewing lines are both clearly marked.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="px-6 py-4 border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight text-gray-900">cadhatter</span>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Custom bucket hat patterns.<br />In seconds.
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Enter your measurements, adjust the sliders, and download a print-ready sewing pattern — no sizing charts, no guesswork.
        </p>
        <Link
          to="/app"
          className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-700 transition-colors"
        >
          Open the Generator
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {FEATURES.map(f => (
          <div key={f.title} className="border border-gray-100 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
