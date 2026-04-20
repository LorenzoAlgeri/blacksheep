import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { basePath } from "@/lib/base-path";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/newsletter/admin/login");
  }

  return (
    <div className="admin-layout flex flex-col min-h-dvh">
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-bs-cream/10">
        <div className="flex items-center gap-3">
          <Image
            src={`${basePath}/bs-logo.svg`}
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
        <AdminNav />
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
