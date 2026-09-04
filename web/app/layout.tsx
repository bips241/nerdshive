import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthProvider from "@/context/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import SocketBootstrapper from "@/components/SocketBootstrapper"; // ✅ import the bootstrapper
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import WebVitalsTracker from "@/components/analytics/WebVitalsTracker";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nerdshive.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NerdShive | High-Velocity Developer Network, Ship Logs & Pair Debugging",
    template: "%s | NerdShive",
  },
  description:
    "The developer-first platform to launch open-source ship logs, solve urgent code SOS debugging requests, publish system architecture RFCs, assemble hackathon crews, and vote on tech showdowns.",
  keywords: [
    "developer platform",
    "developer portfolio",
    "ship log",
    "code sos",
    "pair debugging",
    "system architecture RFC",
    "hackathon team builder",
    "tech showdown",
    "open source showcase",
    "developer proof of work",
    "software engineering discussions",
    "nerdshive",
  ],
  authors: [{ name: "NerdShive Team", url: siteUrl }],
  creator: "NerdShive",
  publisher: "NerdShive",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "NerdShive",
    title: "NerdShive | High-Velocity Developer Network",
    description:
      "Launch ship logs, resolve urgent code SOS bugs, publish system design RFCs, and find hackathon teammates.",
    images: [
      {
        url: `${siteUrl}/api/og?title=NerdShive&desc=High-Velocity+Developer+Network`,
        width: 1200,
        height: 630,
        alt: "NerdShive Developer Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NerdShive | High-Velocity Developer Network",
    description:
      "The developer-first platform for ship logs, code SOS, and system architecture RFCs.",
    images: [`${siteUrl}/api/og?title=NerdShive&desc=High-Velocity+Developer+Network`],
    creator: "@nerdshive",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined,
    },
  },
};

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NerdShive",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description: "High-velocity developer platform for ship logs, pair debugging, and architecture RFCs.",
  sameAs: [
    "https://github.com/bips241/nerdshive",
    "https://twitter.com/nerdshive",
  ],
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NerdShive",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/dashboard/explore?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <WebVitalsTracker />
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SocketBootstrapper /> {/* ✅ run only on client */}
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
