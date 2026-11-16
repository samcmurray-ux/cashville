import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/useTheme";

export const metadata: Metadata = {
  title: "Ca$hville",
  description: "Seven players, one slip a week, the long road to Nashville.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ca$hville",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#efe6d4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Stops iOS pinch-zoom from messing up the bottom-sheet layout.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
