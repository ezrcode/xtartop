import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "xtartop CRM",
  description: "Sistema de gestión de relaciones con clientes para startups y emprendedores",
  manifest: "/manifest.json",
  icons: {
    icon: "/xtartop_isotipo.png",
    shortcut: "/xtartop_isotipo.png",
    apple: "/xtartop_isotipo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "xtartop CRM",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#1a56db",
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
