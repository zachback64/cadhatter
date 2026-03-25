import { render, screen, fireEvent } from '@testing-library/react'
import { AppPage } from './App'

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
