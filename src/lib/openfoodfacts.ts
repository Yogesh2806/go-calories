import type { Nutrition } from "./types";

export interface Product extends Nutrition {
  name: string;
  brand: string;
  serving: string;
}

interface OffNutriments {
  [k: string]: number | string | undefined;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function pick(nut: OffNutriments, key: string, scale: number): number {
  const v = Number(nut[`${key}_100g`]);
  return Number.isFinite(v) && v > 0 ? v * scale : 0;
}

/** Looks a barcode up on Open Food Facts. Returns null when the product isn't in their database. */
export async function lookupBarcode(code: string): Promise<Product | null> {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 6) throw new Error("That doesn't look like a barcode.");
  const fields = "product_name,product_name_en,brands,nutriments,serving_size,serving_quantity";
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${fields}`,
    { headers: { Accept: "application/json" } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Open Food Facts didn't respond. Try again in a moment.");
  const data = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_en?: string;
      brands?: string;
      nutriments?: OffNutriments;
      serving_size?: string;
      serving_quantity?: number | string;
    };
  };
  const p = data.product;
  if (data.status !== 1 || !p) return null;
  const nut = p.nutriments ?? {};
  // Open Food Facts stores per-100g values; scale to the labelled serving when there is one.
  const servingG = Number(p.serving_quantity);
  const hasServing = Number.isFinite(servingG) && servingG > 0;
  const scale = hasServing ? servingG / 100 : 1;
  const energy = pick(nut, "energy-kcal", scale);
  const kcalFromKj = pick(nut, "energy", scale) / 4.184;
  const sodiumG = pick(nut, "sodium", scale);
  const saltG = pick(nut, "salt", scale);
  return {
    name: (p.product_name || p.product_name_en || "Unnamed product").trim(),
    brand: (p.brands ?? "").split(",")[0].trim(),
    serving: hasServing ? (p.serving_size?.trim() || `${Math.round(servingG)} g`) : "100 g",
    calories: Math.round(energy || kcalFromKj),
    protein: r1(pick(nut, "proteins", scale)),
    carbs: r1(pick(nut, "carbohydrates", scale)),
    fat: r1(pick(nut, "fat", scale)),
    fiber: r1(pick(nut, "fiber", scale)),
    sugar: r1(pick(nut, "sugars", scale)),
    sodium: Math.round((sodiumG || saltG / 2.5) * 1000),
  };
}
