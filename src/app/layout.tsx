import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = { title: "RAG Chat" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body className="bg-stone-50 text-stone-900 antialiased">{children}</body></html>;
}
