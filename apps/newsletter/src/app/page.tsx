import { SubscribeForm } from "@/components/SubscribeForm";
import { LandingMotionLazy as LandingMotion } from "@/components/LandingMotionLazy";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSiteConfig() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("site_config")
      .select("tagline, venue")
      .eq("id", "main")
      .single();
    return data ?? { tagline: "EVERY MONDAY", venue: "11 Clubroom · Corso Como · Milano" };
  } catch {
    return { tagline: "EVERY MONDAY", venue: "11 Clubroom · Corso Como · Milano" };
  }
}

export default async function Home() {
  const config = await getSiteConfig();
  return (
    <LandingMotion>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 space-main-y">
        {/* 1. Logo — brand hero */}
        <div className="brand-hero" role="heading" aria-level={1} aria-label="BLACK SHEEP">
          <div data-motion="logo">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1389.1 879.04"
              fill="var(--bs-cream)"
              style={{
                width: "clamp(180px, 28vw, 220px)",
                maxHeight: "18dvh",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 55%, transparent 95%)",
                maskImage: "radial-gradient(ellipse at center, black 55%, transparent 95%)",
              }}
              aria-hidden="true"
            >
              <g>
                <path d="M1033.1,0l31.36,3.14c160.09,20.33,291.17,145.92,319.33,304.33l5.31,38.14v22.97c-2.17,11.15-5.26,21.69-10.83,31.64-4.97,8.88-11.57,16.11-19.43,22.55-28.54,4.39-58.71,4.43-87.1,8.89-11.89,1.87-31.82,8.89-7.86,14.56,27.61,6.54,62.1,4.8,90.61,9.38,6.63,1.07,11.36,6.39,15.58,11.41,10.59,12.57,15.86,27.44,19.03,43.42v22.97l-3.17,25.31c-25.4,176.17-174.06,311.64-352.29,320.34H356.56C177.79,870.83,25.91,732.23,3.24,554.73l-3.14-31.32v-17.98l98.01-1c-.04,61.86,20.52,122.28,58.6,170.71,49.55,63.01,124.22,101.93,204.86,106.02h666.09c52.84-2.86,103.65-19.8,146.77-50.17,64.31-45.3,108.29-118.72,115.61-197.52l-115.72-34.74c-59.75-23.78-58.3-97.92,4.02-119.42,36.67-12.65,74.8-21.77,111.69-33.77-8.09-84.48-57.21-161.61-129.01-206.11-41.33-25.62-87.59-39.23-136.37-41.58H365.56c-49.39,2.23-96.7,16.29-138.37,42.58-79.61,50.22-129.66,139.32-129.08,234.15H.1c.22-6.3-.31-12.7,0-18.98C9.42,164.14,165.64,9.1,357.1,0h676Z" />
                <path d="M257.74,544.74c3.72,3.85,6.11,11.86,9.54,16.94,33.08,48.88,144.91,68.45,200.27,70.65,107,4.25,216.8-3.32,324.09,0,37.57-2.84,75.15-7.77,111.23-18.75,30.68-9.34,83.68-31.53,94.29-64.64,2.66-8.3,3.34-44.89,1.51-53.55-2.02-9.49-13.12-15.49-22.05-16.93l-748.05.05c-11.05-.5-22.63-5.48-26.77-16.21.76-30.71-3.38-65.81-.67-96.19,4.5-50.41,68.58-86.42,110.74-102.15,141.82-52.9,312.76-21.31,461.79-30.26,75.72-.97,248.35,30.55,277.65,112.23,9.39,26.18-28.74,36.92-47.12,24.1-7.55-5.27-8.75-13.15-13.66-20.32-29.26-42.77-120.2-62.74-169.03-67.89-109.69-11.58-228.21,2.26-338.93-3.16-48.74,2.45-98.03,8.12-143.97,25-27.02,9.93-76.24,33.91-79.47,66.45-.84,8.47-1.32,39.26.22,46.71,1.96,9.48,15.4,16.07,24.29,16.69l747.03-.03c11.83.6,25.29,7.7,26.5,20.48-3.71,38.2,9.03,87.1-10.62,121.32-41.65,72.54-177.82,99.09-254.88,102.01h-326.08c-74.34-2.92-192.08-26.5-242.43-85.47-5.35-6.27-15.94-21.61-17.58-29.38-5.47-25.86,36.61-33.83,52.2-17.68Z" />
              </g>
            </svg>
          </div>
        </div>

        {/* 3. "EVERY MONDAY" — temporal context */}
        <p
          data-motion="every-monday"
          className="shimmer-text font-[family-name:var(--font-brand)] text-[10px] tracking-[0.45em] text-bs-cream/30 uppercase mt-8"
        >
          {config.tagline}
        </p>

        {/* 4. Location — spatial context */}
        <p
          data-motion="location"
          className="font-body text-[clamp(7px,2.5vw,10px)] text-bs-cream/25 mt-4 tracking-[0.15em] uppercase text-center whitespace-nowrap"
        >
          {config.venue}
        </p>

        {/* 5. Divider */}
        <div className="space-divider flex items-center justify-center w-full max-w-[320px]">
          <div
            data-motion="divider"
            className="h-px w-full bg-gradient-to-r from-transparent via-bs-cream/15 to-transparent"
          />
        </div>

        {/* 6. Form */}
        <div className="w-full max-w-[320px]">
          <SubscribeForm />
        </div>

        {/* 7. Micro-copy */}
        <p
          data-motion="microcopy"
          className="font-body text-[10px] text-bs-cream/15 space-microcopy text-center tracking-wide"
        >
          Non perderti nulla.
        </p>

        {/* 8. Social icons */}
        <div data-motion="socials" className="flex items-center justify-center gap-1 mt-6">
          <a
            href="https://instagram.com/blacksheep.community_"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Seguici su Instagram"
            className="p-3 text-bs-cream opacity-25 hover:opacity-50 transition-opacity duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@blacksheepcommunity"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Seguici su TikTok"
            className="p-3 text-bs-cream opacity-25 hover:opacity-50 transition-opacity duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.13a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.56z" />
            </svg>
          </a>
        </div>
      </main>
    </LandingMotion>
  );
}
