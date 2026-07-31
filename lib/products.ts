import { supabase } from "./supabase";
import type { Product } from "./db-types";

/** The catalog Claude is allowed to quote from — it must not invent prices. */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, description, in_stock")
    .order("name");

  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return data as Product[];
}
