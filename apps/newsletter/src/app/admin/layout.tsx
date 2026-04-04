import { BSLogo } from "@blacksheep/shared/BSLogo";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between px-4 py-3 border-b border-bs-cream/10">
        <div className="flex items-center gap-3">
          <BSLogo className="text-bs-cream/30" width={28} height={28} />
          <span className="font-heading text-sm tracking-wider text-bs-cream/50">ADMIN</span>
        </div>
        <nav className="flex gap-4 font-body text-xs text-bs-cream/40">
          <Link href="/admin" className="hover:text-bs-cream transition-colors">Iscritti</Link>
          <Link href="/admin/compose" className="hover:text-bs-cream transition-colors">Invia</Link>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
