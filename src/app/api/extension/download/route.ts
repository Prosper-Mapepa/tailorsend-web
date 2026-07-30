import { NextResponse } from "next/server";
import path from "node:path";
import { zipExtensionFolder } from "@/lib/zip-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public download of the TailorSend Fill Chrome extension (zip). */
export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), "extension");
    const zip = await zipExtensionFolder(extensionDir);
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="tailorsend-fill.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Could not package extension." },
      { status: 500 },
    );
  }
}
