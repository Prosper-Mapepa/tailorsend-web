import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AuthProvider } from "@/contexts/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TailorSend — tailor resumes & send applications",
  description:
    "Find target roles, tailor your resume & cover letter with AI, and auto-fill applications for human review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-shell min-h-full flex flex-col font-sans">
        <AuthProvider>
          <Nav />
          <OnboardingGate />
          <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
