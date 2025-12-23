import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LunchSquad 🍔",
  description: "L'application de vote ultime pour le déjeuner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={cn(inter.className, "min-h-screen bg-background antialiased")}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
