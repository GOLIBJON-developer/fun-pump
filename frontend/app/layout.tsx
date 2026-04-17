import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "pumpclone — fair launch on Sepolia",
  description: "Launch and trade tokens via bonding curve.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Web3Provider>
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}