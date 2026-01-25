import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NEARBY CRM",
  description: "Sistema de gestión de relaciones con clientes de NEARBY",
  manifest: "/manifest.json",
  icons: {
    icon: "/nearby_isotipo.png",
    shortcut: "/nearby_isotipo.png",
    apple: "/nearby_isotipo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEARBY CRM",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#2d3e50",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
