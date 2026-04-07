import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between px-4 py-3 border-b border-bs-cream/10">
        <div className="flex items-center gap-3">
          <Image
            src="/bs-logo.svg"
            alt="BS"
            width={28}
            height={18}
            className="opacity-30"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
            }}
          />
          <span className="font-[family-name:var(--font-brand)] text-sm tracking-wider text-bs-cream/50">
            ADMIN
          </span>
        </div>
        <nav className="flex gap-4 font-body text-xs text-bs-cream/40">
          <Link href="/admin" className="hover:text-bs-cream transition-colors">
            Iscritti
          </Link>
          <Link href="/admin/compose" className="hover:text-bs-cream transition-colors">
            Invia
          </Link>
          <Link href="/admin/settings" className="hover:text-bs-cream transition-colors">
            Impostazioni
          </Link>
          <span className="text-bs-cream/10">|</span>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-bs-cream transition-colors"
          >
            Vedi sito ↗
          </a>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
