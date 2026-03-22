import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import dotenv from "dotenv";

function resolveEnvPath(): string | null {
  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
    path.resolve(process.cwd(), "../../../.."),
  ];

  for (const root of roots) {
    const candidate = path.resolve(root, ".env.local");
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
}

const { requireAdminFromSession } = await import("./admin");

test("requireAdminFromSession returns 401 when session is missing", () => {
  const result = requireAdminFromSession(null as any);

  assert.equal(result.ok, false);
  assert.equal(result.response.status, 401);
});

test("requireAdminFromSession returns 403 for non-admin users", () => {
  const session = { user: { id: "user-1", role: "user" } } as any;
  const result = requireAdminFromSession(session);

  assert.equal(result.ok, false);
  assert.equal(result.response.status, 403);
});

test("requireAdminFromSession allows admins", () => {
  const session = { user: { id: "admin-1", role: "admin" } } as any;
  const result = requireAdminFromSession(session);

  assert.equal(result.ok, true);
  assert.equal(result.session?.user?.id, "admin-1");
});
