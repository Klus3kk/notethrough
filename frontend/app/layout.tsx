import type { Metadata } from "next";
import "./globals.css";
import { Sora } from "next/font/google";

const sora = Sora({ subsets: ["latin"], variable: "--font-base", display: "swap" });

export const metadata: Metadata = {
  title: "Notethrough Dashboard",
  description: "Data-driven Spotify intelligence dashboard"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
