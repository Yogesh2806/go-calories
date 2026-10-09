import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Go Calories",
    short_name: "Go Calories",
    description: "See exactly what you eat, every single day.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBFBFA",
    theme_color: "#FBFBFA",
    categories: ["health", "fitness", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log food", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
