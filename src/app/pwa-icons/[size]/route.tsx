import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/pwa/AppIconArt";

const ICONS: Record<string, { size: number; padding: number }> = {
  "192": { size: 192, padding: 0 },
  "512": { size: 512, padding: 0 },
  // Maskable icons keep artwork inside the central safe zone.
  "maskable-512": { size: 512, padding: 64 },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((size) => ({ size }));
}

export async function GET(_request: Request, ctx: RouteContext<"/pwa-icons/[size]">) {
  const { size } = await ctx.params;
  const icon = ICONS[size];
  if (!icon) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIconArt size={icon.size} padding={icon.padding} />, {
    width: icon.size,
    height: icon.size,
  });
}
