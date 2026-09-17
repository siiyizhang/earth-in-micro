import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "explorer@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const token = [
  "e30",
  Buffer.from(
    JSON.stringify({ sub: user.id, exp: 4102444800, role: "authenticated" }),
  ).toString("base64url"),
  "signature",
].join(".");
const session = {
  access_token: token,
  refresh_token: "test-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  user,
};
const place = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Test Pond",
  latitude: 47.37,
  longitude: 8.54,
  was_created: true,
  visit_count: 0,
  find_count: 0,
};
const image = readFileSync(
  new URL("../../public/images/spots/tardigrade-1.jpg", import.meta.url),
);
type RequestLog = {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
};
async function setup(page: Page, signedIn = true, failUpload = false) {
  const calls: RequestLog[] = [];
  const env = readFileSync(
    new URL("../../.env.local", import.meta.url),
    "utf8",
  );
  const host = new URL(env.match(/^VITE_SUPABASE_URL=(.+)$/m)![1]).hostname;
  if (signedIn)
    await page.addInitScript(
      ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: `sb-${host.split(".")[0]}-auth-token`, session },
    );
  await page.route("**/api.mapbox.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );
  await page.route(`https://${host}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    let body = null;
    try {
      body = request.postDataJSON();
    } catch {
      /* Binary uploads. */
    }
    calls.push({ path, method: request.method(), body });
    let response: unknown = [];
    if (path.endsWith("/auth/v1/user")) response = user;
    else if (
      path.endsWith("/auth/v1/verify") ||
      path.endsWith("/auth/v1/token")
    )
      response = session;
    else if (path.endsWith("/auth/v1/otp")) response = {};
    else if (path.endsWith("/find_or_create_place")) response = [place];
    else if (path.endsWith("/places_in_view")) response = [place];
    else if (path.endsWith("/place_log")) response = [];
    else if (path.endsWith("/create_observation"))
      response = "33333333-3333-4333-8333-333333333333";
    else if (path.endsWith("/visits") && request.method() === "POST")
      response = { id: "visit-test" };
    else if (path.endsWith("/observations") && request.method() === "PATCH")
      response = { id: "33333333-3333-4333-8333-333333333333" };
    else if (
      path.includes("/storage/v1/object/") &&
      request.method() === "POST"
    ) {
      if (failUpload)
        return route.fulfill({
          status: 500,
          json: { message: "Upload interrupted", statusCode: "500" },
        });
      response = { Key: "media" };
    } else if (path.endsWith("/taxa"))
      response = [
        { id: "taxon-1", scientific_name: "Euglenidae", rank: "family" },
      ];
    else if (path.endsWith("/life_tree_children"))
      response = body?.p_parent_taxon_id
        ? []
        : [
            {
              taxon_id: "tree-1",
              scientific_name: "Eukaryota",
              rank: "kingdom",
              family_count: 20,
              lit_family_count: 2,
              confirmed_family_count: 1,
            },
          ];
    return route.fulfill({ status: 200, json: response });
  });
  return calls;
}
async function uploadForm(page: Page) {
  await page.goto("/app/gallery");
  await page.getByRole("button", { name: "＋ Add discovery" }).click();
  await page.getByLabel("Photos or videos").setInputFiles({
    name: "sample.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await page.getByLabel("Title", { exact: true }).fill("A tiny discovery");
}
test("guest can sign in with the existing email OTP flow", async ({ page }) => {
  const calls = await setup(page, false);
  await page.goto("/app");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  await page.getByLabel("Email code").fill("123456");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.some((c) => c.path.endsWith("/verify") && c.body?.type === "email"),
  ).toBeTruthy();
});
test("create public place requires explicit exact location agreement", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/app/explore");
  await page.getByRole("button", { name: "＋ Create place" }).click();
  await page.getByLabel("Place name").fill("Test Pond");
  await page.getByRole("button", { name: "Create public place" }).click();
  expect(
    calls.some((c) => c.path.endsWith("/find_or_create_place")),
  ).toBeFalsy();
  await page.getByLabel("I want to share").check();
  await page.getByRole("button", { name: "Create public place" }).click();
  await expect(
    page.getByRole("heading", { name: "Test Pond", exact: true }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path.endsWith("/find_or_create_place"))?.body?.p_name,
  ).toBe("Test Pond");
});
test("private upload publishes only after media attaches, with no public visit", async ({
  page,
}) => {
  const calls = await setup(page);
  await uploadForm(page);
  await page
    .getByRole("button", { name: "Save discovery", exact: true })
    .click();
  await expect(
    page.getByText("Discovery saved to your Eureka account."),
  ).toBeVisible();
  const create = calls.find((c) => c.path.endsWith("/create_observation"))!;
  expect(create.body?.p_visibility).toBe("private");
  expect(create.body?.p_visit_id).toBeNull();
  expect(
    calls.findIndex(
      (c) => c.path.endsWith("/observation_media") && c.method === "POST",
    ),
  ).toBeLessThan(
    calls.findIndex(
      (c) => c.path.endsWith("/observations") && c.method === "PATCH",
    ),
  );
});
test("failed upload never publishes and cleans its draft", async ({ page }) => {
  const calls = await setup(page, true, true);
  await uploadForm(page);
  await page
    .getByRole("button", { name: "Save discovery", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Upload interrupted");
  expect(
    calls.some((c) => c.path.endsWith("/observations") && c.method === "PATCH"),
  ).toBeFalsy();
  expect(
    calls.some(
      (c) => c.path.endsWith("/observations") && c.method === "DELETE",
    ),
  ).toBeTruthy();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("public exact-location upload links a visit to the selected place", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/app/explore");
  await page.getByRole("button", { name: /Test Pond/ }).click();
  await page.getByRole("button", { name: "＋ Add a discovery here" }).click();
  await page.getByLabel("Photos or videos").setInputFiles({
    name: "sample.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await page.getByLabel("Title", { exact: true }).fill("Pond discovery");
  await page.getByLabel("Who can see it?").selectOption("public");
  await page
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("open");
  await page
    .getByRole("button", { name: "Publish discovery", exact: true })
    .click();
  await expect(
    page.getByText("Discovery saved to your Eureka account."),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path.endsWith("/create_observation"))?.body?.p_visit_id,
  ).toBe("visit-test");
});
test("taxonomy branch, courses and mobile layout work without device navigation", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/life-tree");
  await page.getByRole("button", { name: /Eukaryota/ }).click();
  await expect(page.getByText("You have reached the end")).toBeVisible();
  await page.getByRole("link", { name: "Learn", exact: false }).click();
  await page.getByRole("button", { name: /One Drop of Water/ }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a tiny world" }),
  ).toBeVisible();
  expect(
    await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({
    path: "/private/tmp/eureka-webapp-mobile.png",
    fullPage: true,
  });
  await expect(page.getByText(/Connect microscope|Connect Eureka/)).toHaveCount(
    0,
  );
});
test("the real ONNX model executes locally in the browser", async ({
  page,
}) => {
  test.setTimeout(90000);
  await setup(page);
  await uploadForm(page);
  await page.getByRole("button", { name: "✧ Identify photo" }).click();
  await expect(
    page.getByText(/Suggested families|may not contain an organism/),
  ).toBeVisible({ timeout: 80000 });
  await expect(page.locator(".micro-identify").getByRole("alert")).toHaveCount(
    0,
  );
  await expect(page.locator(".micro-identify").getByRole("button")).toHaveCount(
    6,
  );
});
test("an obscured discovery never exposes itself through the exact public place log", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/app/explore");
  await page.getByRole("button", { name: /Test Pond/ }).click();
  await page.getByRole("button", { name: "＋ Add a discovery here" }).click();
  await page.getByLabel("Photos or videos").setInputFiles({
    name: "sample.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await page
    .getByLabel("Title", { exact: true })
    .fill("Sensitive pond discovery");
  await page.getByLabel("Who can see it?").selectOption("public");
  await page
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("obscured");
  await page
    .getByRole("button", { name: "Publish discovery", exact: true })
    .click();
  await expect(
    page.getByText("Discovery saved to your Eureka account."),
  ).toBeVisible();
  expect(
    calls.some((c) => c.path.endsWith("/visits") && c.method === "POST"),
  ).toBeFalsy();
  expect(
    calls.find((c) => c.path.endsWith("/create_observation"))?.body,
  ).toMatchObject({ p_geoprivacy: "obscured", p_visit_id: null });
});
test("manual identification stores the shared taxonomy UUID", async ({
  page,
}) => {
  const calls = await setup(page);
  await uploadForm(page);
  await page.getByLabel("Identification (optional)").fill("Euglen");
  await page.getByRole("button", { name: "Euglenidae family" }).click();
  await page
    .getByRole("button", { name: "Save discovery", exact: true })
    .click();
  await expect(
    page.getByText("Discovery saved to your Eureka account."),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path.endsWith("/create_observation"))?.body
      ?.p_initial_taxon_id,
  ).toBe("taxon-1");
});
test("account sign-out clears the collection and returns to the sign-in gate", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Sign out of this browser" }).click();
  await expect(page.getByText("You are browsing as a guest.")).toBeVisible();
  expect(calls.some((c) => c.path.endsWith("/logout"))).toBeTruthy();
  await page.getByRole("link", { name: "Gallery" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }).last(),
  ).toBeVisible();
});

test("video upload can select and save a cover frame", async ({ page }) => {
  const calls = await setup(page);
  await page.goto("/app/gallery");
  await page.getByRole("button", { name: "＋ Add discovery" }).click();
  await page
    .getByLabel("Photos or videos")
    .setInputFiles(
      fileURLToPath(new URL("./fixtures/sample.mp4", import.meta.url)),
    );
  await page.getByLabel("Title", { exact: true }).fill("Video discovery");
  await expect(
    page.getByRole("button", { name: "Use this frame" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Use this frame" }).click();
  await expect(
    page.getByRole("button", { name: /Frame selected/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "✧ Identify photo" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Save discovery", exact: true })
    .click();
  await expect(
    page.getByText("Discovery saved to your Eureka account."),
  ).toBeVisible();
  const media = calls.find(
    (c) => c.path.endsWith("/observation_media") && c.method === "POST",
  );
  expect(media?.body?.kind).toBe("video");
  expect(media?.body?.thumbnail_path).toMatch(/_thumb.jpg$/);
});
