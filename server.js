import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { exec } from "node:child_process";

const ROOT = normalize(join(process.cwd(), "public"));
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent((req.url || "/").split("?")[0]));
    if (path.endsWith("/") || path === "") path += "index.html";
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) throw new Error("Forbidden");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}).listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`🔪 快刀廚房已啟動: ${url}`);
  if (process.platform === "darwin") exec(`open ${url}`);
});