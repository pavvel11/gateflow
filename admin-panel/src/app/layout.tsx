import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "@/components/providers/config-provider";
import { ThemeProvider, ThemeScript } from "@/components/providers/theme-provider";
import { TrackingConfigProvider } from "@/components/providers/tracking-config-provider";
import { getPublicIntegrationsConfig } from "@/lib/actions/integrations";
import { getShopConfig } from "@/lib/actions/shop-config";
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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Sellf Admin Panel",
  description: "Modern admin panel for Sellf content protection system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, shopConfig] = await Promise.all([
    getPublicIntegrationsConfig().catch(() => null),
    getShopConfig().catch(() => null),
  ]);
  const adminTheme = shopConfig?.checkout_theme || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript adminTheme={adminTheme} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${dmMono.variable} antialiased`}
      >
        {/* Tracking Scripts (GTM, Pixel, Klaro, Custom Scripts) */}
        <Suspense fallback={null}>
          <TrackingProvider config={config} />
        </Suspense>

        <ThemeProvider adminTheme={adminTheme}>
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