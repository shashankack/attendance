import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BAW Attendance",
  description: "Check in at the office. The server decides if you were there.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full antialiased", outfit.variable, fraunces.variable)}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
