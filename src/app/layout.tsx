import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "HotelFlow", template: "%s · HotelFlow" },
  description: "Tudo o que a equipe do hotel precisa, em um só lugar.",
  applicationName: "HotelFlow",
  appleWebApp: { capable: true, title: "HotelFlow", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafafa",
};

// Aplica tema e idioma salvos antes da primeira pintura (sem "piscar").
const bootScript = `(function(){try{var t=localStorage.getItem('hf-theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.querySelector('meta[name=theme-color]')&&document.querySelector('meta[name=theme-color]').setAttribute('content','#0a0a0a')}var l=localStorage.getItem('hf-locale');if(l==='en'||l==='es'||l==='pt-BR')document.documentElement.lang=l}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
