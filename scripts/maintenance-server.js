const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const maintenanceDirectory = process.argv[2] || "/var/www/tribefinder/maintenance";
const port = Number(process.env.PORT || 3000);
const html = fs.readFileSync(path.join(maintenanceDirectory, "index.html"));
const logo = fs.readFileSync(path.join(maintenanceDirectory, "logo.png"));

const server = http.createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  response.setHeader("Retry-After", "60");
  response.statusCode = 503;

  if (request.url === "/logo.png") {
    response.setHeader("Content-Type", "image/png");
    response.end(request.method === "HEAD" ? undefined : logo);
    return;
  }

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(request.method === "HEAD" ? undefined : html);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Maintenance server listening on 127.0.0.1:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
