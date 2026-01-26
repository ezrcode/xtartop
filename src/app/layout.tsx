import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2d3e50",
};

export const metadata: Metadata = {
  title: "NEARBY",
  description: "Sistema de gestión de relaciones con clientes de NEARBY",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/nearby_isotipo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/nearby_isotipo.png", color: "#2d3e50" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NEARBY",
    startupImage: "/icons/icon-512x512.png",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "NEARBY",
    "apple-mobile-web-app-title": "NEARBY",
    "msapplication-TileColor": "#2d3e50",
    "msapplication-tap-highlight": "no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: "#fff",
              border: "1px solid #D7D9DB",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 10px 15px -3px rgb(45 62 80 / 0.1)",
            },
            className: "text-sm",
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
