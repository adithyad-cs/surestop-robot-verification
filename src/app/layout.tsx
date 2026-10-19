import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SureStop",
  description: "Find. Verify. Then arrive. A browser robot simulation that verifies its target before declaring arrival.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
