// Stores a message from the web app's feedback widget in the Notion
// "Web App Feedback" database (under the Eureka! page).
const DATABASE_ID = process.env.NOTION_FEEDBACK_DATABASE_ID || "116c09f3350d47cd804cf1208d8b0d19";
const TYPES = ["Something is hard to use", "Feature request", "Other"];

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const richText = (content) => (content ? [{ type: "text", text: { content } }] : []);

/** Validates a submission and writes it to Notion. Returns [status, body]. */
export async function submitFeedback(body) {
  if (!process.env.NOTION_TOKEN) return [500, { error: "Feedback is not configured." }];
  // Honeypot: real visitors never see or fill this field.
  if (text(body?.website, 200)) return [200, { ok: true }];
  const message = text(body?.message, 2000);
  if (message.length < 3) return [400, { error: "Please write a short message." }];
  const type = TYPES.includes(body?.type) ? body.type : "Other";
  const contact = text(body?.contact, 200);
  const account = text(body?.account, 200);
  const page = text(body?.page, 500);
  const summary = message.replace(/\s+/g, " ").slice(0, 80) + (message.length > 80 ? "…" : "");

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: DATABASE_ID },
      properties: {
        Summary: { title: richText(summary) },
        Message: { rich_text: richText(message) },
        Type: { select: { name: type } },
        Status: { select: { name: "New" } },
        Contact: { rich_text: richText(contact) },
        Account: { rich_text: richText(account) },
        Page: { url: /^https?:\/\//.test(page) ? page : null },
      },
    }),
  });
  if (!response.ok) {
    console.error("Notion feedback write failed", response.status, await response.text());
    return [502, { error: "Your message could not be sent. Please try again later." }];
  }
  return [200, { ok: true }];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
    const [status, result] = await submitFeedback(body);
    res.status(status).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Your message could not be sent. Please try again later." });
  }
}
