"use client";

import dynamic from "next/dynamic";

export const MascotteIntroLazy = dynamic(
  () => import("@/components/MascotteIntro").then((mod) => mod.MascotteIntro),
  { ssr: false },
);
