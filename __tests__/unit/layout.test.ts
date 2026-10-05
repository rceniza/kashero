import { getProductColumns, isTabletLayout } from "../../src/shared/layout";

describe("responsive POS layout", () => {
  it("uses a compact two-column catalog on narrow phones", () => {
    expect(isTabletLayout(320)).toBe(false);
    expect(getProductColumns(320)).toBe(2);
  });

  it("shows a side-by-side order panel on tablets and adds room on wide screens", () => {
    expect(isTabletLayout(744)).toBe(true);
    expect(getProductColumns(744)).toBe(2);
    expect(getProductColumns(800)).toBe(3);
    expect(getProductColumns(1100)).toBe(4);
  });
});
