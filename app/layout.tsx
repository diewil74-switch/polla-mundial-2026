import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polla Mundial 2026",
  description: "Polla familiar para la Copa Mundial FIFA 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} theme-light h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fbf1f0] text-[#1e2a44]" style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
