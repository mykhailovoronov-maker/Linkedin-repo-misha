import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkedIn Ads Launcher",
  description:
    "Upload a creative, pick an audience, set a budget, and launch a LinkedIn Ads campaign with automatic URL tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
