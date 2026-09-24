"use client";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export default function ToolButton({children,type="button",...props}:PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>){
  return <button type={type} {...props}>{children}</button>;
}
