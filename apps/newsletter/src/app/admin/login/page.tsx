"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { BSLogo } from "@blacksheep/shared/BSLogo";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenziali non valide.");
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-[300px]">
      <label htmlFor="admin-email" className="sr-only">Email</label>
      <input
        id="admin-email"
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30"
      />
      <label htmlFor="admin-password" className="sr-only">Password</label>
      <input
        id="admin-password"
        name="password"
        type="password"
        placeholder="Password"
        required
        className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-bs-cream/10 text-bs-cream font-heading text-lg tracking-wider py-3 rounded-md hover:bg-bs-cream/20 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "..." : "ACCEDI"}
      </button>
      {error && <p className="font-body text-xs text-bs-burgundy text-center">{error}</p>}
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <BSLogo className="text-bs-cream/20 mb-8" width={60} height={60} />
      <h1 className="font-heading text-2xl tracking-wider text-bs-cream mb-6">ADMIN</h1>
      <Suspense fallback={<p className="font-body text-bs-cream/30">Caricamento...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
