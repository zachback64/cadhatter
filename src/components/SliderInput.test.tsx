import { render, screen, fireEvent } from '@testing-library/react'
import { SliderInput } from './SliderInput'

test('renders label and input', () => {
  const onChange = vi.fn()
  render(<SliderInput label="Hat height" value={100} min={50} max={200} step={1} unit="mm" onChange={onChange} />)
  expect(screen.getByText('Hat height')).toBeInTheDocument()
  expect(screen.getByRole('spinbutton')).toHaveValue(100)
})

test('calls onChange when number input changes', () => {
  const onChange = vi.fn()
  render(<SliderInput label="Hat height" value={100} min={50} max={200} step={1} unit="mm" onChange={onChange} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '120' } })
  expect(onChange).toHaveBeenCalledWith(120)
})

test('clamps value to min/max on input blur', () => {
  const onChange = vi.fn()
  render(<SliderInput label="Hat height" value={100} min={50} max={200} step={1} unit="mm" onChange={onChange} />)
  const input = screen.getByRole('spinbutton')
  fireEvent.change(input, { target: { value: '999' } })
  fireEvent.blur(input)
  expect(onChange).toHaveBeenLastCalledWith(200)
})
