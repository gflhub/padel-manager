import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/feedback/session-provider";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padel Manager - Gestão de Complexos Esportivos",
  description: "Sistema completo para gestão de quadras, reservas e comandas de complexos esportivos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          {children}
          <FeedbackButton />
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
