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
    <div className="group relative aspect-[3/4] overflow-hidden border border-bs-cream/5 cursor-pointer">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={eventName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-bs-navy to-[#0a0e1a]">
          <span className="absolute inset-0 flex items-center justify-center font-brand text-bs-cream/[0.06] text-[120px] leading-none select-none transition-transform duration-500 group-hover:scale-[1.02]">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-bs-cream text-xs font-brand uppercase tracking-wider">{eventName}</p>
        <p className="text-bs-cream/50 text-[10px] mt-0.5">{eventDate}</p>
      </div>
    </div>
  );
}
