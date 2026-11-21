import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRD Hub",
  description: "Create, review and track PRDs against today's product and the 2028 vision.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
