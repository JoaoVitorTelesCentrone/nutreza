import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nutreza — Tecnologia que nutre o cuidado",
  description: "Seu consultório de nutrição em um lugar só, com uma copiloto de IA que rascunha e você aprova.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
