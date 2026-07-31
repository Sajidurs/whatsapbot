"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Branch, CustomerWithBranch } from "@/lib/db-types";

const ALL_BRANCHES = "all";

export default function LeadsPage() {
  const [customers, setCustomers] = useState<CustomerWithBranch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = supabaseBrowser();
      const [customersResult, branchesResult] = await Promise.all([
        supabase
          .from("customers")
          .select("*, branches ( name )")
          .order("first_seen", { ascending: false }),
        supabase.from("branches").select("id, name").order("name"),
      ]);

      const failure = customersResult.error ?? branchesResult.error;
      if (failure) {
        setError(failure.message);
      } else {
        setCustomers((customersResult.data ?? []) as CustomerWithBranch[]);
        setBranches((branchesResult.data ?? []) as Branch[]);
      }
      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    if (branchFilter === ALL_BRANCHES) return customers;
    if (branchFilter === "none") return customers.filter((c) => c.branch_id === null);
    return customers.filter((c) => String(c.branch_id) === branchFilter);
  }, [customers, branchFilter]);

  function exportCsv() {
    const rows = [
      ["name", "phone", "branch", "first_seen"],
      ...filtered.map((customer) => [
        customer.name ?? "",
        customer.phone_number,
        customer.branches?.name ?? "",
        customer.first_seen,
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
    // Leading BOM so Excel reads the Arabic names as UTF-8.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Leads
          <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
            {filtered.length}
            {filtered.length !== customers.length && ` of ${customers.length}`}
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter by branch"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value={ALL_BRANCHES}>All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={String(branch.id)}>
                {branch.name}
              </option>
            ))}
            <option value="none">No branch yet</option>
          </select>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium">Branch</th>
                  <th className="px-4 py-2.5 font-medium">First seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                    >
                      No customers match this filter.
                    </td>
                  </tr>
                )}
                {filtered.map((customer) => (
                  <tr
                    key={customer.phone_number}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70"
                  >
                    <td className="px-4 py-2.5 text-zinc-900 dark:text-zinc-100">
                      {customer.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {customer.phone_number}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {customer.branches?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {new Date(customer.first_seen).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Quote every field so commas, quotes and newlines in names can't shift columns. */
function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
