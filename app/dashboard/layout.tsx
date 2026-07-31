import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import Sidebar from "./_components/sidebar";
import LogoutButton from "./_components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts already bounced anonymous requests; this is the check next to the
  // data, and it's what gives us the admin's email for the header.
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-4 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {user.email}
          </span>
          <LogoutButton className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800" />
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
