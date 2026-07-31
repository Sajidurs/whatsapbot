"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";

const LINKS = [
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/leads", label: "Leads" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 shrink-0 items-center px-6 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Qalbia admin
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <LogoutButton className="mt-1 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100" />
      </nav>
    </aside>
  );
}
