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
          width={100}
          height={64}
          className="drop-shadow-[0_0_15px_rgba(190,131,5,0.25)]"
          priority
          style={{ filter: "brightness(0) saturate(100%) invert(47%) sepia(96%) saturate(500%) hue-rotate(20deg)" }}
        />
      </div>

      {/* Title block */}
      <div className="mt-8 mb-8 text-center">
        <p
          className="font-[family-name:var(--font-brand)] text-sm tracking-[0.3em] text-bs-cream/60 uppercase animate-fade-in-scale"
          style={{ animationDelay: "100ms" }}
        >
          Every Monday
        </p>
        <h1
          className="font-[family-name:var(--font-brand)] text-[3.5rem] leading-[0.95] tracking-[0.08em] text-bs-cream mt-1 animate-fade-in-scale"
          style={{ animationDelay: "200ms" }}
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
        IG @blacksheep.community_ &middot; 10K+
      </p>
    </main>
  );
}
