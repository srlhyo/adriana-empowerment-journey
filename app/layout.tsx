import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "Adriana Empowerment Journey",
  description: "Booking and empowerment journey platform",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-offwhite text-darkgray antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
