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
    { media: "(prefers-color-scheme: light)", color: "#F3F0EA" },
    { media: "(prefers-color-scheme: dark)", color: "#18191B" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-style="paper" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Paper style fonts. Mono Glass uses the system font, so these only matter once Paper is on. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap"
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
