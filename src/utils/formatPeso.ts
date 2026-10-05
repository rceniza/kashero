/** Format an integer amount in centavos as Philippine pesos. */
export function formatPeso(amountInCentavos: number): string {
  if (!Number.isSafeInteger(amountInCentavos)) {
    throw new RangeError('Amount must be a safe integer in centavos.');
  }

  return `₱${(amountInCentavos / 100).toFixed(2)}`;
}
