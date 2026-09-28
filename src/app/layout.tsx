import type { Metadata } from "next";
import { Playpen_Sans } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const playpen = Playpen_Sans({
  variable: "--font-playpen",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BAW Attendance",
  description: "Check in at the office. The server decides if you were there.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full antialiased", playpen.variable)}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
