import { render, screen, fireEvent } from '@testing-library/react'
import { AppPage, SWATCHES } from './App'

// Mock HatScene — Three.js/WebGL doesn't work in jsdom
vi.mock('../components/HatScene', () => ({
  HatScene: () => <div data-testid="hat-scene" />,
}))

// Mock PatternView
vi.mock('../components/PatternView', () => ({
  PatternView: () => <div data-testid="pattern-view" />,
}))

// Mock URL.createObjectURL / revokeObjectURL
beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

test('shows Upload fabric button in 3D tab', () => {
  render(<AppPage />)
  expect(screen.getByRole('button', { name: /upload fabric/i })).toBeInTheDocument()
})

test('shows Remove button after file selected, then reverts on remove', () => {
  render(<AppPage />)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([''], 'fabric.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })

  expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /upload fabric/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /remove/i }))
  expect(screen.getByRole('button', { name: /upload fabric/i })).toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
})

test('revokes URL on unmount if texture is loaded', () => {
  const { unmount } = render(<AppPage />)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([''], 'fabric.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })
  // URL is now set

  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
})

test('renders color swatches in 3D tab', () => {
  render(<AppPage />)
  for (const swatch of SWATCHES) {
    expect(screen.getByTitle(swatch.name)).toBeInTheDocument()
  }
})

test('swatches are disabled when fabric is loaded', () => {
  render(<AppPage />)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([''], 'fabric.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })

  const swatchBar = screen.getByTestId('swatch-bar')
  expect(swatchBar).toHaveStyle('pointer-events: none')
  expect(swatchBar).toHaveStyle('opacity: 0.4')
})

test('toggle head button shows and hides stand-in head', () => {
  render(<AppPage />)
  // Button should be present in 3D tab
  const toggleBtn = screen.getByRole('button', { name: /show head/i })
  expect(toggleBtn).toBeInTheDocument()

  // After clicking, it should say "Hide head"
  fireEvent.click(toggleBtn)
  expect(screen.getByRole('button', { name: /hide head/i })).toBeInTheDocument()
})
