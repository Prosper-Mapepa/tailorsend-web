import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AuthProvider } from "@/contexts/AuthProvider";
import { SITE_LOGO_PATH } from "@/lib/brand";

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
  icons: {
    icon: SITE_LOGO_PATH,
    apple: SITE_LOGO_PATH,
  },
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
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
