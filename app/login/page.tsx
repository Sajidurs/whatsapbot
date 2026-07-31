import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Qalbia admin",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Qalbia admin
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to manage WhatsApp conversations.
        </p>
        {/* LoginForm reads ?next= with useSearchParams, which needs a boundary. */}
        <Suspense fallback={<div className="mt-8 h-48" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
