import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";

/** Display face: headings, big numbers and primary button labels. */
const lilita = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** Body and UI face, variable so 600, 700 and 800 all come from one file. */
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Last Chair",
  description:
    "A cozy ski-hill tycoon for your phone: reopen Dutch Hill, Vermont, for one more winter.",
  // Pages serves under a repo path, so icon URLs carry the base path explicitly.
  icons: {
    icon: [{ url: `${basePath}/favicon.ico`, sizes: "48x48" }],
    apple: [{ url: `${basePath}/icons/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Last Chair",
    // Opaque dark bar above the page: the scene is full bleed, and a translucent bar would put white clock text over light sky.
    statusBarStyle: "black",
  },
  formatDetection: { telephone: false },
  // Next emits only the unprefixed tag; iOS Safari still reads the Apple one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b3a57",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lilita.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
