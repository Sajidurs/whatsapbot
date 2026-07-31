import { supabase, type Customer } from "./supabase";

export async function getOrCreateCustomer(
  phoneNumber: string,
  name: string | null
): Promise<Customer> {
  const { data: existing, error: selectError } = await supabase
    .from("customers")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to look up customer: ${selectError.message}`);
  }

  if (existing) {
    const customer = existing as Customer;
    await supabase
      .from("customers")
      .update({ last_seen: new Date().toISOString() })
      .eq("phone_number", phoneNumber);
    return customer;
  }

  const { data: created, error: insertError } = await supabase
    .from("customers")
    .insert({ phone_number: phoneNumber, name, state: "new" })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create customer: ${insertError.message}`);
  }
  return created as Customer;
}

export async function setCustomerBranch(phoneNumber: string, branchId: number) {
  const { error } = await supabase
    .from("customers")
    .update({ branch_id: branchId, state: "active" })
    .eq("phone_number", phoneNumber);
  if (error) throw new Error(`Failed to set customer branch: ${error.message}`);
}

export async function setCustomerState(phoneNumber: string, state: Customer["state"]) {
  const { error } = await supabase
    .from("customers")
    .update({ state })
    .eq("phone_number", phoneNumber);
  if (error) throw new Error(`Failed to set customer state: ${error.message}`);
}
