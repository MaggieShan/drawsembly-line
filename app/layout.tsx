import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doodle Together",
  description:
    "A multiplayer drawing party game — everyone draws a piece, together it becomes a masterpiece.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
