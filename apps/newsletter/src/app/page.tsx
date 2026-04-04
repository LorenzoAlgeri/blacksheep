import Image from "next/image";
import { SubscribeForm } from "@/components/SubscribeForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative">
      {/* Logo BS monogram */}
      <div className="animate-fade-in-scale" style={{ animationDelay: "0ms" }}>
        <Image
          src="/bs-logo.svg"
          alt="BLACK SHEEP"
          width={140}
          height={90}
          priority
          style={{
            height: "auto",
            filter: "brightness(0) saturate(100%) invert(47%) sepia(96%) saturate(500%) hue-rotate(20deg)",
            WebkitFilter: "drop-shadow(0 0 25px rgba(190,131,5,0.4)) drop-shadow(0 0 50px rgba(190,131,5,0.15))",
          }}
          className="drop-shadow-[0_0_25px_rgba(190,131,5,0.4)]"
        />
      </div>

      {/* Title block */}
      <div className="mt-8 mb-2 text-center">
        <p
          className="font-[family-name:var(--font-brand)] text-[11px] tracking-[0.35em] text-bs-gold/50 uppercase animate-fade-in-scale"
          style={{ animationDelay: "100ms" }}
        >
          Every Monday
        </p>
        <h1
          className="font-[family-name:var(--font-brand)] text-[3.5rem] leading-[0.95] tracking-[0.08em] text-bs-cream mt-1 animate-fade-in-scale"
          style={{ animationDelay: "200ms", textShadow: "0 0 40px rgba(255,255,243,0.08)" }}
        >
          BLACK<br />SHEEP
        </h1>
        <p
          className="font-body text-xs text-bs-cream/35 mt-3 tracking-wide animate-fade-in-scale"
          style={{ animationDelay: "300ms" }}
        >
          11 Clubroom &middot; Corso Como &middot; Milano
        </p>
      </div>

      {/* Gold divider */}
      <div
        className="w-16 h-px bg-bs-gold/30 mx-auto my-6 animate-fade-in-scale"
        style={{ animationDelay: "350ms" }}
      />

      {/* Form */}
      <div className="w-full max-w-[320px]">
        <SubscribeForm />
      </div>

      {/* Micro-copy */}
      <p
        className="font-body text-[11px] text-bs-cream/35 mt-5 text-center animate-slide-up"
        style={{ animationDelay: "600ms" }}
      >
        Lineup e date prima di tutti. Zero spam.
      </p>

      {/* Social proof footer */}
      <p
        className="font-body text-[11px] text-bs-cream/20 mt-auto pt-8 animate-slide-up"
        style={{ animationDelay: "700ms" }}
      >
        <a
          href="https://instagram.com/blacksheep.community_"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-bs-cream transition-colors duration-300"
        >
          IG @blacksheep.community_
        </a>
        {" "}&middot; 10K+
      </p>
    </main>
  );
}
