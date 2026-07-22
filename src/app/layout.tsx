import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
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

/** Matches tailored-resume PDF typography (Roboto 9/11/14 pt, black). */
const resumeRoboto = Roboto({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-resume",
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
      className={`${geistSans.variable} ${geistMono.variable} ${resumeRoboto.variable} h-full antialiased`}
    >
      <body className="app-shell min-h-full flex flex-col font-sans">
        <AuthProvider>
          <Nav />
          <OnboardingGate />
          <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
