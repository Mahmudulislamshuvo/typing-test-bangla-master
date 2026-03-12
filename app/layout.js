import "./globals.css";
import { Manrope, Noto_Sans_Bengali } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Typing Test",
  description: "A simple typing test built with Next.js and Tailwind CSS.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${notoSansBengali.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
