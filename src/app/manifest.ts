import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinkForge",
    short_name: "LinkForge",
    description: "Personal link & knowledge manager",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0F12",
    theme_color: "#0D0F12",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
