"use client";

import Image from "next/image";

interface GalleryCardProps {
  imageSrc?: string;
  eventName: string;
  eventDate: string;
  index: number;
}

export function GalleryCard({ imageSrc, eventName, eventDate, index }: GalleryCardProps) {
  return (
    <div
      role="img"
      aria-label={`Foto serata ${eventName}, ${eventDate}`}
      className="gallery-card group relative aspect-[3/4] overflow-hidden border border-bs-cream/5 cursor-pointer will-change-transform"
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={eventName}
          fill
          data-gallery-inner
          className="object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:motion-safe:scale-[1.04] scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div
          data-gallery-inner
          className="absolute inset-[-10%] bg-gradient-to-br from-[#111111] to-[#0a0a0a]"
        >
          <span className="number-placeholder absolute inset-0 flex items-center justify-center font-brand text-bs-cream/[0.06] text-[120px] leading-none select-none motion-safe:transition-all motion-safe:duration-500 group-hover:motion-safe:scale-[1.02] group-hover:motion-safe:-translate-y-1">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Hover overlay — cinematic gradient from bottom */}
      <div className="overlay absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-300 flex flex-col justify-end p-3">
        <p className="text-bs-cream text-xs font-brand uppercase tracking-wider motion-safe:transition-transform motion-safe:duration-300 translate-y-2 group-hover:translate-y-0">
          {eventName}
        </p>
        <p className="text-bs-cream/50 text-[10px] mt-0.5">{eventDate}</p>
      </div>
    </div>
  );
}
