import Image from "next/image";
import { BSLogo } from "@blacksheep/shared/BSLogo";
import { SubscribeForm } from "@/components/SubscribeForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Mascot background — positioned behind content */}
      <div
        className="absolute inset-0 flex items-end justify-center pointer-events-none select-none animate-fade-in-scale opacity-[0.12]"
        style={{ animationDelay: "0ms" }}
      >
        <Image
          src="/mascot.png"
          alt=""
          width={400}
          height={600}
          className="object-contain max-h-[85vh] translate-y-[5%]"
          priority
        />
      </div>

      {/* Logo */}
      <div
        className="relative z-10 animate-fade-in-scale"
        style={{ animationDelay: "0ms" }}
      >
        <BSLogo
          className="text-bs-cream"
          width={120}
          height={120}
        />
      </div>

      {/* Title block */}
      <div className="relative z-10 mt-6 mb-8 text-center">
        <p
          className="font-heading text-lg tracking-[0.2em] text-bs-cream/70 animate-fade-in-scale"
          style={{ animationDelay: "100ms" }}
        >
          EVERY MONDAY
        </p>
        <h1
          className="font-heading text-[4rem] leading-none tracking-[0.15em] text-bs-cream animate-fade-in-scale"
          style={{ animationDelay: "200ms" }}
        >
          BLACK SHEEP
        </h1>
        <p
          className="font-body text-sm text-bs-cream/40 mt-2 animate-fade-in-scale"
          style={{ animationDelay: "300ms" }}
        >
          11 Clubroom &middot; Corso Como &middot; Milano
        </p>
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-[320px]">
        <SubscribeForm />
      </div>

      {/* Micro-copy */}
      <p
        className="relative z-10 font-body text-xs text-bs-cream/40 mt-5 text-center animate-slide-up"
        style={{ animationDelay: "600ms" }}
      >
        Lineup e date prima di tutti. Zero spam.
      </p>

      {/* Social proof footer */}
      <p
        className="relative z-10 font-body text-xs text-bs-cream/25 mt-auto pt-8 animate-slide-up"
        style={{ animationDelay: "700ms" }}
      >
        IG @blacksheep.community_ &middot; 10K+
      </p>
    </main>
  );
}
