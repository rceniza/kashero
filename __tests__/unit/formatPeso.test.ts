import { formatPeso } from '../../src/utils/formatPeso';

describe('formatPeso', () => {
  it('formats centavos as pesos with two decimal places', () => {
    expect(formatPeso(12550)).toBe('₱125.50');
  });

  it('rejects fractional centavo values', () => {
    expect(() => formatPeso(125.5)).toThrow(RangeError);
  });
});
