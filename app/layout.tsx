import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DirhamLink | Your Money. Your Destination.",
  description:
    "Explore indicative exchange rates and submit a remittance inquiry with DirhamLink in the UAE.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
