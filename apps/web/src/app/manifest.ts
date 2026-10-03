import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutreza - Área do paciente",
    short_name: "Nutreza",
    description: "Acompanhe seu plano, diário e progresso.",
    start_url: "/paciente",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#2e7d5b",
    icons: [
      { src: "/brand/logo-icon.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/logo-icon.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
