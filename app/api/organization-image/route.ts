import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!configuredBaseUrl) {
    return new Response("API base URL is not configured", { status: 500 });
  }

  try {
    const apiOrigin = new URL(configuredBaseUrl).origin;
    const suppliedUrl = request.nextUrl.searchParams.get("url");
    const suppliedPath = request.nextUrl.searchParams.get("path");
    const imageUrl = suppliedUrl
      ? new URL(suppliedUrl)
      : suppliedPath
        ? new URL(suppliedPath, `${apiOrigin}/`)
        : null;

    if (
      !imageUrl ||
      imageUrl.origin !== apiOrigin ||
      imageUrl.pathname.includes("..") ||
      !/\.(jpe?g|png|webp)$/i.test(imageUrl.pathname)
    ) {
      return new Response("Invalid organization image URL", { status: 400 });
    }

    const imageResponse = await fetch(imageUrl, {
      cache: "no-store",
    });

    if (!imageResponse.ok || !imageResponse.body) {
      return new Response("Organization image could not be loaded", {
        status: imageResponse.status || 502,
      });
    }

    const contentType = imageResponse.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new Response("Organization resource is not an image", { status: 502 });
    }

    return new Response(imageResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Organization image could not be loaded", { status: 502 });
  }
}
