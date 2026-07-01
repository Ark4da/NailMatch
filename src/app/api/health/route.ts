import { NextResponse } from "next/server";
import { getExternalImageSearchStatus } from "@/features/image-search/client";

export function GET(): NextResponse {
  return NextResponse.json({
    ok: true,
    service: "nailmatch",
    externalImageSearch: getExternalImageSearchStatus()
  });
}
