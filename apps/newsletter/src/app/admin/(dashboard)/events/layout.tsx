import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function EventsAdminLayout({ children }: { children: ReactNode }) {
  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    redirect("/admin?notice=feature_disabled");
  }
  return <>{children}</>;
}
