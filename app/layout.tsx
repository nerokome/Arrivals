import type { Metadata } from "next";
import React from "react";
import { Lato } from "next/font/google";
import "./globals.css";
import NewProvider from "@/app/utils/provider";

// Load Lato across the app
const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Punchly",
  description: "Attendance Management System",
  applicationName: "Punchly",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Punchly",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/punchly-icon.svg", type: "image/svg+xml" },
      { url: "/punchly-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className={`${lato.className} antialiased`}>
        <NewProvider>{children}</NewProvider>
      </body>
    </html>
  );
}
