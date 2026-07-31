import { supabase, type Branch } from "./supabase";

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .order("id");

  if (error) throw new Error(`Failed to load branches: ${error.message}`);
  return data;
}
