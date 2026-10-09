import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/app";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: { default: "Go Calories", template: "%s · Go Calories" },
  description: "See exactly what you eat, every single day. Simple logging, clear goals, zero guesswork.",
  applicationName: "Go Calories",
  appleWebApp: {
    capable: true,
    title: "Go Calories",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFBFA" },
    { media: "(prefers-color-scheme: dark)", color: "#18191B" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
