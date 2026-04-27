// Local dev API server — run with: npx tsx server.ts
import { createServer } from "http";
import { readFileSync } from "fs";

// Load .env
try {
  const env = readFileSync(".env", "utf-8");
  for (const line of env.split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim();
      if (k) process.env[k] = v;
    }
  }
} catch {}

const TOKEN = process.env.NOTION_TOKEN!;
const DB_ID = process.env.NOTION_DATABASE_ID!;

function normalizeKey(s: string) {
  return s.trim().toLowerCase();
}

function findProp(props: Record<string, any>, keys: string[]) {
  for (const k of keys) {
    if (props[k]) return props[k];
  }
  const wanted = new Set(keys.map(normalizeKey));
  for (const [k, v] of Object.entries(props)) {
    if (wanted.has(normalizeKey(k))) return v;
  }
  return null;
}

function textFromProp(p: any): string {
  if (!p) return "";
  if (p.type === "title") return (p.title ?? []).map((t: any) => t.plain_text).join("");
  if (p.type === "rich_text") return (p.rich_text ?? []).map((t: any) => t.plain_text).join("");
  if (p.type === "select") return p.select?.name ?? "";
  if (p.type === "multi_select") return (p.multi_select ?? []).map((s: any) => s.name).join(", ");
  if (p.type === "url") return p.url ?? "";
  if (p.type === "email") return p.email ?? "";
  if (p.type === "phone_number") return p.phone_number ?? "";
  if (p.type === "formula") {
    if (p.formula?.type === "string") return p.formula.string ?? "";
    if (p.formula?.type === "number") return String(p.formula.number ?? "");
  }
  return "";
}

function numberFromProp(p: any): number | null {
  if (!p) return null;
  if (p.type === "number" && typeof p.number === "number") return p.number;
  if (p.type === "formula" && p.formula?.type === "number" && typeof p.formula.number === "number") return p.formula.number;
  if (p.type === "rich_text") {
    const t = (p.rich_text ?? []).map((r: any) => r.plain_text).join("").trim();
    if (!t) return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getText(props: Record<string, any>, keys: string | string[]): string {
  const p = findProp(props, Array.isArray(keys) ? keys : [keys]);
  return textFromProp(p);
}

function getNumber(props: Record<string, any>, keys: string | string[]): number | null {
  const p = findProp(props, Array.isArray(keys) ? keys : [keys]);
  return numberFromProp(p);
}

function getImageUrls(props: Record<string, any>): [string, string] {
  const p = findProp(props, ["Image", "Images", "Photo", "Photos", "Thumbnail"]);
  if (p?.type === "files") {
    const urls = (p.files ?? []).map((f: any) => {
      if (f.type === "external") return f.external.url;
      if (f.type === "file") return f.file.url;
      return "";
    }).filter(Boolean);
    return [urls[0] || "", urls[1] || ""];
  }
  return ["", ""];
}

function getPageCoverUrl(page: any): string {
  const cover = page?.cover;
  if (!cover) return "";
  if (cover.type === "external") return cover.external?.url ?? "";
  if (cover.type === "file") return cover.file?.url ?? "";
  return "";
}

function getPageIconUrl(page: any): string {
  const icon = page?.icon;
  if (!icon) return "";
  if (icon.type === "external") return icon.external?.url ?? "";
  if (icon.type === "file") return icon.file?.url ?? "";
  // emoji icons don’t have a URL; ignore
  return "";
}

async function notionQuery(body: any) {
  const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  return res;
}

async function queryNotion() {
  const publishedKeys = [
    process.env.NOTION_PUBLISHED_PROP,
    "Published",
    "Publish",
    "Public",
  ].filter(Boolean) as string[];

  for (const key of publishedKeys) {
    const res = await notionQuery({ filter: { property: key, checkbox: { equals: true } } });
    if (res.ok) return res.json();
    const text = await res.text();
    if (res.status === 400 && /could not find property/i.test(text)) continue;
    throw new Error(`Notion API error: ${res.status} ${text}`);
  }

  const res = await notionQuery({});
  if (!res.ok) throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
  return res.json();
}

const LOCAL_IMAGE_MAP: Record<string, string> = {
  "https://justthesea.com/wp-content/uploads/2024/07/1.jpeg": "/images/spots/sapphirina-1.jpg",
  "https://pelorus-statamic.s3.eu-west-2.amazonaws.com/images/yachting/destinations/french-polynesia/french-polynesia-mountain-background-hero.jpg": "/images/spots/symbiodiniaceae-1.jpg",
  "https://ars.els-cdn.com/content/image/1-s2.0-S0011224015300134-gr1.jpg": "/images/spots/tardigrade-1.jpg",
  "https://www.nipr.ac.jp/antarctic/jarestations/image/syowa-yagai-yukidorisawa.jpg": "/images/spots/tardigrade-2.jpg",
  "https://www.natura-sciences.com/wp-content/uploads/2023/11/sang-glaciers-algue-neige-rouge.jpg": "/images/spots/snow-algae-2.jpg",
  "https://miro.medium.com/v2/resize:fit:4800/format:webp/1*etu67Q-gsJrVNSBWl_Bd5A.jpeg": "/images/spots/radiolarian-1.jpg",
  "https://paleonerdish.wordpress.com/wp-content/uploads/2014/08/il_570xn-210850396.jpg": "/images/spots/radiolarian-2.jpg",
  "https://micro.magnet.fsu.edu/primer/techniques/polarized/gallery/images/olivineproxeneandesitelarge.jpg": "/images/spots/olivine-1.jpg",
  "https://apsa.anu.edu.au/_images/full/204-1-4_polar_1.jpg": "/images/spots/pollen-1.jpg",
  "https://www.garden.eco/wp-content/uploads/2018/07/passion-fruit-flower.jpg": "/images/spots/pollen-2.jpg",
  "https://media.posterlounge.com/img/products/50000/46115/46115_poster.jpg": "/images/spots/rotifer-2.jpg",
};

const LOCAL_ATTACHMENT_MAP: Record<string, string> = {
  "8a6295ae-0eb6-4de9-91ad-2fe2fc940dae": "/images/spots/euglenid-1.jpg",
  "09c2cabb-e137-4f4c-b08a-ababe683d856": "/images/spots/euglenid-2.jpg",
  "381401df-190a-4531-b5e3-5e7d7c12b513": "/images/spots/snow-algae-1.jpg",
  "e55f3b5f-c3fb-4ac2-a769-f797fbfb1eef": "/images/spots/rotifer-1.jpg",
  "482db133-58fc-4d80-8217-3499413aaff3": "/images/spots/bioluminescent-2.jpg",
};

function proxyUrl(url: string): string {
  if (!url) return "";
  if (LOCAL_IMAGE_MAP[url]) return LOCAL_IMAGE_MAP[url];
  const uuidMatch = url.match(/prod-files-secure\.s3[^/]*\/[^/]+\/([0-9a-f-]{36})\//);
  if (uuidMatch && LOCAL_ATTACHMENT_MAP[uuidMatch[1]]) return LOCAL_ATTACHMENT_MAP[uuidMatch[1]];
  const b64 = Buffer.from(url, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `/api/proxy-image?u=${b64}`;
}

function decodeB64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const reqUrl = req.url ?? "";

  if (reqUrl === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (reqUrl === "/api/spots" && req.method === "GET") {
    try {
      if (!TOKEN || !DB_ID) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID in .env" }));
        return;
      }

      const data = await queryNotion();
      const spots = data.results
        .filter((p: any) => p.object === "page")
        .map((page: any) => {
          let [u1, u2] = getImageUrls(page.properties);
          if (!u1) u1 = getPageCoverUrl(page) || getPageIconUrl(page);
          if (!u2) u2 = u1 ? "" : (getPageIconUrl(page) || getPageCoverUrl(page));
          const latVal = getNumber(page.properties, ["Latitude", "Lat"]);
          const lngVal = getNumber(page.properties, ["Longitude", "Lng", "Lon"]);
          return {
            id: page.id,
            name: getText(page.properties, ["Name", "Title"]),
            nameLatin: getText(page.properties, ["Latin Name", "Scientific Name", "Latin", "Species"]),
            location: getText(page.properties, ["Location", "Place", "Where"]),
            lat: latVal ?? 0,
            lng: lngVal ?? 0,
            size: getText(page.properties, ["Size"]),
            desc: getText(page.properties, ["Description", "Desc", "About"]),
            color: "#ffffff",
            imageUrl: proxyUrl(u1),
            imageUrl2: proxyUrl(u2),
            imageCredit: getText(page.properties, ["Image Credit", "Credit"]),
            _hasCoords: latVal !== null && lngVal !== null,
          };
        })
        .filter((s: any) => s._hasCoords || s.location === "ISS")
        .map(({ _hasCoords, ...s }: any) => s);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(spots));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    }
  } else if (reqUrl.startsWith("/api/proxy-image") && req.method === "GET") {
    try {
      const params = new URL(reqUrl, "http://localhost").searchParams;
      const u = params.get("u");
      const target = u ? decodeB64Url(u) : params.get("url");
      if (!target) { res.writeHead(400); res.end(); return; }
      const upstream = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EarthInMicro/1.0)",
          "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
        },
      });
      if (!upstream.ok) { res.writeHead(upstream.status); res.end(); return; }
      const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" });
      const buf = await upstream.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (err) {
      console.error("proxy-image error:", err);
      res.writeHead(502);
      res.end();
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3001, () => {
  console.log("API server: http://localhost:3001/api/spots");
});
