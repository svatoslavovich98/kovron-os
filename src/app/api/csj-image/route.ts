import { NextRequest, NextResponse } from "next/server";

const SOURCE_ROOT = "http://www.csj918.com/manage/";

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path") || "";

  if (!filePath || filePath.includes("..") || !/^[a-zA-Z0-9_./%-]+$/u.test(filePath)) {
    return new NextResponse("Invalid image path", { status: 400 });
  }

  try {
    const response = await fetch(`${SOURCE_ROOT}${filePath}`, {
      headers: { Referer: "http://www.csj918.com/" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) return new NextResponse("Image not found", { status: 404 });

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Invalid image response", { status: 502 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return new NextResponse("Image unavailable", { status: 502 });
  }
}
