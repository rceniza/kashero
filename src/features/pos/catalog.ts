import type { CatalogItem } from "../catalog/types";

export const categories = [
  "All items",
  "Coffee",
  "Tea",
  "Bakery",
  "Grocery",
] as const;
export type Category = string;

export type { CatalogItem } from "../catalog/types";

export const catalog: CatalogItem[] = [
  {
    id: "latte",
    productId: "latte",
    name: "Café latte",
    detail: "Regular · Hot",
    category: "Coffee",
    price: 14500,
    color: "#F3E4D5",
    symbol: "☕",
  },
  {
    id: "americano",
    productId: "americano",
    name: "Americano",
    detail: "Regular · Hot",
    category: "Coffee",
    price: 12000,
    color: "#E7D7C9",
    symbol: "◉",
  },
  {
    id: "matcha",
    productId: "matcha",
    name: "Matcha cloud",
    detail: "Iced · 16 oz",
    category: "Tea",
    price: 16500,
    color: "#E2E8D9",
    symbol: "抹",
  },
  {
    id: "croissant",
    productId: "croissant",
    name: "Butter croissant",
    detail: "Freshly baked",
    category: "Bakery",
    price: 9500,
    color: "#F4E4BF",
    symbol: "🥐",
  },
  {
    id: "beans",
    productId: "beans",
    name: "House blend",
    detail: "Whole bean · 250 g",
    category: "Grocery",
    price: 38000,
    color: "#E8DDD2",
    symbol: "✳",
  },
  {
    id: "cookie",
    productId: "cookie",
    name: "Choco cookie",
    detail: "Bakery · Single",
    category: "Bakery",
    price: 6500,
    color: "#EAD9C9",
    symbol: "●",
  },
];

export function filterCatalog(
  items: CatalogItem[],
  category: Category,
  query: string,
): CatalogItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const inCategory = category === "All items" || item.category === category;
    const matchesQuery = `${item.name} ${item.detail}`
      .toLocaleLowerCase()
      .includes(normalizedQuery);
    return inCategory && matchesQuery;
  });
}
