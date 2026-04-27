// Map external image URLs to locally hosted copies in /images/spots/
const LOCAL_IMAGE_MAP = {
  // external URLs
  "https://justthesea.com/wp-content/uploads/2024/07/1.jpeg": "/images/spots/sapphirina-1.jpg",
  "https://pelorus-statamic.s3.eu-west-2.amazonaws.com/images/yachting/destinations/french-polynesia/french-polynesia-mountain-background-hero.jpg": "/images/spots/symbiodiniaceae-1.jpg",
  "https://ars.els-cdn.com/content/image/1-s2.0-S0011224015300134-gr1.jpg": "/images/spots/tardigrade-1.jpg",
  "https://www.nipr.ac.jp/antarctic/jarestations/image/syowa-yagai-yukidorisawa.jpg": "/images/spots/tardigrade-2.jpg",
  "https://www.natura-sciences.com/wp-content/uploads/2023/11/sang-glaciers-algue-neige-rouge.jpg": "/images/spots/snow-algae-2.jpg",
  "https://miro.medium.com/v2/resize:fit:4800/format:webp/1*etu67Q-gsJrVNSBWl_Bd5A.jpeg": "/images/spots/radiolarian-1.jpg",
  "https://paleonerdish.wordpress.com/wp-content/uploads/2014/08/il_570xn-210850396.jpg": "/images/spots/radiolarian-2.jpg",
  "https://www.outofoffice.com/wp-content/uploads/w3-webp/uploads/6-56.png.webp": "/images/spots/bioluminescent-1.webp",
  "https://micro.magnet.fsu.edu/primer/techniques/polarized/gallery/images/olivineproxeneandesitelarge.jpg": "/images/spots/olivine-1.jpg",
  "https://apsa.anu.edu.au/_images/full/204-1-4_polar_1.jpg": "/images/spots/pollen-1.jpg",
  "https://www.garden.eco/wp-content/uploads/2018/07/passion-fruit-flower.jpg": "/images/spots/pollen-2.jpg",
  "https://media.posterlounge.com/img/products/50000/46115/46115_poster.jpg": "/images/spots/rotifer-2.jpg",
};

// Notion attachment UUIDs (stable, embedded in the signed S3 URL path)
const LOCAL_ATTACHMENT_MAP = {
  "8a6295ae-0eb6-4de9-91ad-2fe2fc940dae": "/images/spots/euglenid-1.jpg",
  "09c2cabb-e137-4f4c-b08a-ababe683d856": "/images/spots/euglenid-2.jpg",
  "381401df-190a-4531-b5e3-5e7d7c12b513": "/images/spots/snow-algae-1.jpg",
  "e55f3b5f-c3fb-4ac2-a769-f797fbfb1eef": "/images/spots/rotifer-1.jpg",
  "482db133-58fc-4d80-8217-3499413aaff3": "/images/spots/bioluminescent-2.jpg",
};

function proxyUrl(url) {
  if (!url) return "";
  if (LOCAL_IMAGE_MAP[url]) return LOCAL_IMAGE_MAP[url];
  // Match Notion S3 attachment by UUID in path
  const uuidMatch = url.match(/prod-files-secure\.s3[^/]*\/[^/]+\/([0-9a-f-]{36})\//);
  if (uuidMatch && LOCAL_ATTACHMENT_MAP[uuidMatch[1]]) return LOCAL_ATTACHMENT_MAP[uuidMatch[1]];
  const b64 = Buffer.from(url, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `/api/proxy-image?u=${b64}`;
}

function normalizeKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

function findProp(props, keys) {
  for (const k of keys) {
    if (props[k]) return props[k];
  }
  const wanted = new Set(keys.map(normalizeKey));
  for (const [k, v] of Object.entries(props)) {
    if (wanted.has(normalizeKey(k))) return v;
  }
  return null;
}

function textFromProp(p) {
  if (!p) return "";
  if (p.type === "title") return (p.title ?? []).map(t => t.plain_text).join("");
  if (p.type === "rich_text") return (p.rich_text ?? []).map(t => t.plain_text).join("");
  if (p.type === "select") return p.select?.name ?? "";
  if (p.type === "multi_select") return (p.multi_select ?? []).map(s => s.name).join(", ");
  if (p.type === "formula") {
    if (p.formula?.type === "string") return p.formula.string ?? "";
    if (p.formula?.type === "number") return String(p.formula.number ?? "");
  }
  return "";
}

function numberFromProp(p) {
  if (!p) return null;
  if (p.type === "number" && typeof p.number === "number") return p.number;
  if (p.type === "formula" && p.formula?.type === "number" && typeof p.formula.number === "number") return p.formula.number;
  if (p.type === "rich_text") {
    const t = (p.rich_text ?? []).map(r => r.plain_text).join("").trim();
    if (!t) return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getText(props, keys) {
  const p = findProp(props, Array.isArray(keys) ? keys : [keys]);
  return textFromProp(p);
}

function getNumber(props, keys) {
  const p = findProp(props, Array.isArray(keys) ? keys : [keys]);
  return numberFromProp(p);
}

function getImageUrls(props) {
  const p = findProp(props, ["Image", "Images", "Photo", "Photos", "Thumbnail"]);
  if (p?.type === "files") {
    const urls = (p.files ?? []).map(f => {
      if (f.type === "external") return f.external.url;
      if (f.type === "file") return f.file.url;
      return "";
    }).filter(Boolean);
    return [urls[0] || "", urls[1] || ""];
  }
  return ["", ""];
}

function getPageCoverUrl(page) {
  const cover = page?.cover;
  if (!cover) return "";
  if (cover.type === "external") return cover.external?.url ?? "";
  if (cover.type === "file") return cover.file?.url ?? "";
  return "";
}

function getPageIconUrl(page) {
  const icon = page?.icon;
  if (!icon) return "";
  if (icon.type === "external") return icon.external?.url ?? "";
  if (icon.type === "file") return icon.file?.url ?? "";
  return "";
}

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      res.status(500).json({ error: "Missing env vars", token: !!process.env.NOTION_TOKEN, db: !!process.env.NOTION_DATABASE_ID });
      return;
    }

    const notionQuery = async (body) => {
      return fetch(
        `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body ?? {}),
        }
      );
    };

    const publishedKeys = [
      process.env.NOTION_PUBLISHED_PROP,
      "Published",
      "Publish",
      "Public",
    ].filter(Boolean);

    let data = null;
    for (const key of publishedKeys) {
      const r = await notionQuery({ filter: { property: key, checkbox: { equals: true } } });
      if (r.ok) { data = await r.json(); break; }
      const text = await r.text();
      if (r.status === 400 && /could not find property/i.test(text)) continue;
      res.status(500).json({ error: `Notion ${r.status}: ${text}` });
      return;
    }

    if (!data) {
      const r = await notionQuery({});
      if (!r.ok) {
        const text = await r.text();
        res.status(500).json({ error: `Notion ${r.status}: ${text}` });
        return;
      }
      data = await r.json();
    }

    const spots = data.results
      .filter(p => p.object === "page")
      .map(page => {
        const props = page.properties ?? {};
        let [u1, u2] = getImageUrls(props);
        if (!u1) u1 = getPageCoverUrl(page) || getPageIconUrl(page);
        if (!u2) u2 = u1 ? "" : (getPageIconUrl(page) || getPageCoverUrl(page));
        const latVal = getNumber(props, ["Latitude", "Lat"]);
        const lngVal = getNumber(props, ["Longitude", "Lng", "Lon"]);

        return {
          id: page.id,
          name: getText(props, ["Name", "Title"]),
          nameLatin: getText(props, ["Latin Name", "Scientific Name", "Latin", "Species"]),
          location: getText(props, ["Location", "Place", "Where"]),
          lat: latVal ?? 0,
          lng: lngVal ?? 0,
          size: getText(props, ["Size"]),
          desc: getText(props, ["Description", "Desc", "About"]),
          color: "#ffffff",
          imageUrl: proxyUrl(u1),
          imageUrl2: proxyUrl(u2),
          imageCredit: getText(props, ["Image Credit", "Credit"]),
          _hasCoords: latVal !== null && lngVal !== null,
        };
      })
      .filter(s => s._hasCoords || s.location === "ISS")
      .map(({ _hasCoords, ...s }) => s);

    res.status(200).json(spots);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
