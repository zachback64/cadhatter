import { DEFAULT_PARAMS } from './types'

test('DEFAULT_PARAMS has all required fields', () => {
  expect(DEFAULT_PARAMS.headCircumference).toBe(570)
  expect(DEFAULT_PARAMS.goreCount).toBe(6)
  expect(DEFAULT_PARAMS.units).toBe('cm')
})
