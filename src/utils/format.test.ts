import { format } from '.'

describe('format', () => {
  test('decimal', () => {
    expect(format.decimal()).toBe(format.decimal('0'))
    expect(format.decimal('0.123456789')).toBe('0.123456')
  })

  test('amount', () => {
    expect(format.amount('1')).toBe('0.000001')
    expect(format.amount('1234567', { integer: true })).toBe('1')
  })

  test('denom', () => {
    expect(format.denom('uluna')).toBe('Luna')
    expect(format.denom('ukrw')).toBe('KRT')
  })

  test('display', () => {
    const display = format.display({ amount: '1234567890.1', denom: 'uluna' })
    expect(display).toEqual({ value: '1,234.567890', unit: 'Luna' })
  })

  test('coin', () => {
    const coin = { amount: '1234567890', denom: 'uluna' }
    const config = { integer: true }
    expect(format.coin(coin, config)).toBe('1,234 Luna')
  })

  test('truncate', () => {
    const address = 'terra1srw9p49fa46fw6asp0ttrr3cj8evmj3098jdej'
    expect(format.truncate(address, [9, 7])).toBe('terra1srw...098jdej')
  })
})
