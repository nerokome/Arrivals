import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Punchly",
    short_name: "Punchly",
    description: "Attendance Management System",
    start_url: "/",
    display: "standalone",
    background_color: "#263238",
    theme_color: "#263238",
    icons: [
      {
        src: "/punchly-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/punchly-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
