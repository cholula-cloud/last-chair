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

export const metadata: Metadata = {
  title: "Last Chair",
  description:
    "A cozy ski-hill tycoon for your phone: reopen Dutch Hill, Vermont, for one more winter.",
  appleWebApp: {
    capable: true,
    title: "Last Chair",
  },
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
