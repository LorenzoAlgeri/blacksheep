import Image from "next/image";
import { SubscribeForm } from "@/components/SubscribeForm";

export default function Home() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
      {/* Logo — flash-lit entrance */}
      <div className="animate-flash-in" style={{ animationDelay: "0ms" }}>
        <Image
          src="/bs-logo.svg"
          alt="BLACK SHEEP"
          width={120}
          height={77}
          priority
          style={{
            height: "auto",
            filter: "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
          }}
        />
      </div>

      {/* Title block — heavy, raw, flyer-style */}
      <div className="mt-10 text-center">
        <p
          className="font-[family-name:var(--font-brand)] text-[10px] tracking-[0.45em] text-bs-cream/30 uppercase animate-fade-in-scale"
          style={{ animationDelay: "200ms" }}
        >
          Every Monday
        </p>
        <h1
          className="font-[family-name:var(--font-brand)] text-[4.5rem] leading-[0.85] tracking-[0.02em] text-bs-cream mt-2 animate-fade-in-scale"
          style={{
            animationDelay: "300ms",
            textShadow: "0 0 80px rgba(255,255,243,0.05), 0 0 4px rgba(255,255,243,0.03)",
          }}
        >
          BLACK<br />SHEEP
        </h1>
        <p
          className="font-body text-[10px] text-bs-cream/15 mt-5 tracking-[0.15em] uppercase animate-fade-in-scale"
          style={{ animationDelay: "400ms" }}
        >
          11 Clubroom &middot; Corso Como &middot; Milano
        </p>
      </div>

      {/* Divider — line that expands from center */}
      <div className="my-8 flex items-center justify-center w-full max-w-[320px]">
        <div
          className="h-px w-full bg-gradient-to-r from-transparent via-bs-cream/10 to-transparent animate-line-expand"
          style={{ animationDelay: "500ms" }}
        />
      </div>

      {/* Form */}
      <div className="w-full max-w-[320px]">
        <SubscribeForm />
      </div>

      {/* Micro-copy */}
      <p
        className="font-body text-[10px] text-bs-cream/18 mt-6 text-center tracking-wide animate-slide-up"
        style={{ animationDelay: "800ms" }}
      >
        Iscriviti. Lineup e date prima di tutti.
      </p>

      {/* Footer */}
      <div
        className="mt-auto pt-12 text-center animate-slide-up"
        style={{ animationDelay: "900ms" }}
      >
        <a
          href="https://instagram.com/blacksheep.community_"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-[10px] text-bs-cream/12 hover:text-bs-cream/30 transition-colors duration-300 tracking-[0.1em] uppercase"
        >
          @blacksheep.community_
        </a>
      </div>
    </main>
  );
}
