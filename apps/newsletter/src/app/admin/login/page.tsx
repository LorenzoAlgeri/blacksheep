"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { basePath } from "@/lib/base-path";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") ?? "/newsletter/admin";
  // Only allow callbacks starting with /newsletter/admin to prevent open redirect
  const callbackUrl = rawCallbackUrl.startsWith("/newsletter/admin")
    ? rawCallbackUrl
    : "/newsletter/admin";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
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
    } catch {
      setError("Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-[300px]">
      <label htmlFor="admin-email" className="sr-only">
        Email
      </label>
      <input
        id="admin-email"
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30"
      />
      <label htmlFor="admin-password" className="sr-only">
        Password
      </label>
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
        className="w-full bg-bs-cream/10 text-bs-cream font-[family-name:var(--font-brand)] text-lg tracking-wider py-3 rounded-md hover:bg-bs-cream/20 transition-colors disabled:opacity-50 cursor-pointer"
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
      <Image
        src={`${basePath}/bs-logo.svg`}
        alt="BLACK SHEEP"
        width={60}
        height={39}
        className="mb-8 opacity-20"
        style={{
          filter:
            "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
        }}
      />
      <h1 className="font-[family-name:var(--font-brand)] text-2xl tracking-wider text-bs-cream mb-6">
        ADMIN
      </h1>
      <Suspense fallback={<p className="font-body text-bs-cream/30">Caricamento...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
