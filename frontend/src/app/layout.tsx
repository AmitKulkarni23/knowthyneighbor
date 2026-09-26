import type { Metadata } from "next";
import { Permanent_Marker, Caveat, Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import ThemeRegistry from "@/components/ThemeRegistry";
import MSWProvider from "@/mocks/MSWProvider";
import "./globals.css";

const permanentMarker = Permanent_Marker({
  weight: "400",
  variable: "--font-marker",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["600", "700"],
  variable: "--font-condensed",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KnowThyNeighbor — Find couples in your neighborhood for shared meals",
  description:
    "Connect with couples nearby for dinners, lunches, and brunches. Real people, real food, real connection. No algorithms, no AI slop — just neighbors sharing a table.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${permanentMarker.variable} ${caveat.variable} ${barlowCondensed.variable} ${sourceSans.variable}`}
    >
      <body>
        <MSWProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </MSWProvider>
      </body>
    </html>
  );
}
