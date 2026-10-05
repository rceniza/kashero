export const TABLET_BREAKPOINT = 700;

export function isTabletLayout(width: number): boolean {
  return width >= TABLET_BREAKPOINT;
}

export function getProductColumns(width: number): number {
  if (width >= 1100) return 4;
  if (width >= 800) return 3;
  return 2;
}
