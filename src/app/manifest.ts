import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HotelFlow",
    short_name: "HotelFlow",
    description: "App para equipes de hotéis, resorts e pousadas.",
    lang: "pt-BR",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#0f766e",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novo chamado", short_name: "Chamado", url: "/maintenance?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Escala", short_name: "Escala", url: "/schedule", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Frases prontas", short_name: "Frases", url: "/phrases", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
