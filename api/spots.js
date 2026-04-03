function proxyUrl(url) {
  if (!url) return "";
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
