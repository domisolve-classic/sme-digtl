import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qatar Site Risk Assessment Generator",
  description:
    "AI-assisted Construction Site Risk Assessment generator for Qatar, grounded in QCS 2014 and Qatar Labour Law.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold">
              Qatar Site Risk Assessment Generator
            </Link>
            <Link href="/history" className="text-sm text-blue-600 hover:underline">
              Past Assessments
            </Link>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
        <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
          AI-assisted draft only. Not a substitute for review by a licensed
          Qatar HSE professional.
        </footer>
      </body>
    </html>
  );
}
