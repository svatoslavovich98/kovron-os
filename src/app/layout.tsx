import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ViewportSync } from "@/components/viewport-sync";
import { PortraitGuard } from "@/components/portrait-guard";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "KOVRON OS",
  description: "Система управления заказами KOVRON",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KOVRON OS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111311",
};

// Выполняется до первой отрисовки — иначе при загрузке страница
// моргает тёмной темой, даже если сохранена светлая.
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('kovron-theme');
    if (t !== 'light' && t !== 'dark') t = 'light';
    var r = document.documentElement;
    if (t === 'dark') r.classList.add('dark'); else r.classList.remove('dark');
    r.style.colorScheme = t;
  } catch (e) {
    document.documentElement.classList.remove('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ViewportSync />
        <PortraitGuard />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
