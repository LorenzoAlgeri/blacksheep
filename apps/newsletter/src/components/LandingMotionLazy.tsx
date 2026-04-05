"use client";

import dynamic from "next/dynamic";

export const LandingMotionLazy = dynamic(
  () => import("@/components/LandingMotion").then((mod) => mod.LandingMotion),
  { ssr: false },
);
