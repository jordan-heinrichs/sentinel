import PixelNav from "../components/PixelNav";
import "./globals.css";
import Providers from "./providers";
import { Press_Start_2P } from "next/font/google";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>
        <Providers>
          <PixelNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}