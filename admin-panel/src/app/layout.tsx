import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "@/components/providers/config-provider";
import { ThemeProvider, ThemeScript } from "@/components/providers/theme-provider";
import { TrackingConfigProvider } from "@/components/providers/tracking-config-provider";
import { getPublicIntegrationsConfig } from "@/lib/actions/integrations";
import TrackingProvider from "@/components/TrackingProvider";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GateFlow Admin Panel",
  description: "Modern admin panel for GateFlow content protection system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getPublicIntegrationsConfig().catch(() => null);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Tracking Scripts (GTM, Pixel, Klaro, Custom Scripts) */}
        <Suspense fallback={null}>
          <TrackingProvider config={config} />
        </Suspense>

        <ThemeProvider>
          <TrackingConfigProvider config={config}>
            <ConfigProvider>
              {children}
            </ConfigProvider>
          </TrackingConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}