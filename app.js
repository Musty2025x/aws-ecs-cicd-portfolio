const http = require("http");

const port = Number(process.env.PORT || 3000);
const version = process.env.APP_VERSION || "local";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  if (req.url === "/version") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ version }));
  }

  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AWS CI/CD Portfolio</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:12vh auto;padding:0 24px;color:#172033}
main{border:1px solid #dbe2ea;border-radius:18px;padding:32px}
small{color:#5c687a}code{background:#f1f5f9;padding:3px 7px;border-radius:6px}
</style></head>
<body><main><h1>It works! 🚀</h1>
<p>This sample app was deployed using an automated AWS CI/CD pipeline.</p>
<p>Pipeline: <strong>GitHub → CodePipeline → CodeBuild → ECR → ECS Fargate</strong></p>
<p>Version: <code>${version}</code></p>
<p><a href="/health">Health check</a> · <a href="/version">Version endpoint</a></p>
<small>Portfolio learning project — not for production usage</small></main></body></html>`);
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Sample app listening on port ${port}; version=${version}`);
});
