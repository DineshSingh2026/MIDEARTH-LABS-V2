import type { Metadata, Viewport } from "next";
import { Sora, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/siteUrl";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora", display: "swap", preload: true });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: site.meta.title,
  description: site.meta.description,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/app-icon.svg", apple: "/brand/apple-touch-icon.png" },
  openGraph: { title: site.meta.title, description: site.meta.description, type: "website" },
  twitter: { card: "summary_large_image", title: site.meta.title, description: site.meta.description },
};
export const viewport: Viewport = { themeColor: site.meta.themeColor };

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: site.brand, logo: "/brand/app-icon-512.png" },
    {
      "@type": "SoftwareApplication",
      name: site.brand,
      applicationCategory: "BusinessApplication",
      operatingSystem: "macOS, Windows, Android, iOS",
      offers: site.pricing.plans.map((p) => ({
        "@type": "Offer",
        name: p.name,
        ...(p.custom ? {} : { price: p.price.replace("$", ""), priceCurrency: "USD" }),
        description: p.body,
      })),
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
