const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");

test("health and version endpoints respond correctly", async (t) => {
  const port = 3100 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ["app.js"], {
    env: { ...process.env, PORT: String(port), APP_VERSION: "test-version" },
    stdio: "ignore"
  });
  t.after(() => child.kill("SIGTERM"));

  const get = (path) => new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const result = await get("/health");
      if (result.status === 200) { ready = true; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(ready, true, "server should start");

  const health = await get("/health");
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body), { status: "ok" });

  const version = await get("/version");
  assert.equal(version.status, 200);
  assert.deepEqual(JSON.parse(version.body), { version: "test-version" });
});
