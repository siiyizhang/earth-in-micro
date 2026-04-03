import type { VercelRequest, VercelResponse } from "@vercel/node";

function decodeB64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const u = req.query.u as string | undefined;
  const target = u ? decodeB64Url(u) : (req.query.url as string);
  if (!target) { res.status(400).end(); return; }
  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EarthInMicro/1.0)",
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });
    if (!upstream.ok) { res.status(upstream.status).end(); return; }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    const buf = await upstream.arrayBuffer();
    res.status(200).end(Buffer.from(buf));
  } catch {
    res.status(502).end();
  }
}
