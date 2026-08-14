"use client";

import { useEffect, useState } from "react";

const CHUNKS = Array.from({ length: 6 }, (_, index) => `/royal-gate/chunk${index + 1}.txt`);

export default function RoyalGateBackground() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all(CHUNKS.map((url) => fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })))
      .then((parts) => {
        if (active) setSrc(`data:image/webp;base64,${parts.join("")}`);
      })
      .catch(() => {
        if (active) setSrc(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div className="h-full w-full bg-[#070b12]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35" />
    </div>
  );
}
