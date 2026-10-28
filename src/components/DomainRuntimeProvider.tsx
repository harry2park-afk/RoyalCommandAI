"use client";

import { createContext, useContext } from "react";
import type { PublicDomainRuntimeContext } from "@/config/countryResolver";

const RuntimeContext = createContext<PublicDomainRuntimeContext | null>(null);

export function DomainRuntimeProvider({ value, children }: { value: PublicDomainRuntimeContext; children: React.ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useDomainRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("DomainRuntimeProvider is required");
  return value;
}
