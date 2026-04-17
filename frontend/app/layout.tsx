import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Web3Provider } from "@/providers/Web3Provider";
import { Header } from "@/components/Header";
import "./globals.css";

const font = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "PumpClone — Launch Meme Coins on Sepolia",
  description: "Create and trade tokens via bonding curves. Portfolio project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="bg-[#0a0a0a] text-[#e8e8e8] min-h-screen font-main antialiased">
        <Web3Provider>
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}