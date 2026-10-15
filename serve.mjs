// Aperçu local : node serve.mjs  ->  http://localhost:5173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

createServer(async (req, res) => {
  try {
    const name = decodeURIComponent((req.url || "/").split("?")[0]).replace(/^\/+/, "") || "index.html";
    if (!/^[\w\-./]+\.(html|json)$/.test(name) || name.includes("..")) throw new Error("introuvable");
    const body = await readFile(new URL(name, import.meta.url));
    res.writeHead(200, { "content-type": (name.endsWith(".json") ? "application/json" : "text/html") + "; charset=utf-8", "cache-control": "no-store" });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Page introuvable");
  }
}).listen(5173, () => console.log("Desk sur http://localhost:5173"));
