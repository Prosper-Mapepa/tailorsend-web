import { watch } from "node:fs";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "docs", "investor");
const htmlSource = path.join(source, "html");
const destination = path.join(root, "public", "docs");
const filesDestination = path.join(destination, "files");
const reloadFile = path.join(destination, "__reload.txt");

let timer;
let syncing = false;
let queued = false;

async function syncDocs() {
  if (syncing) {
    queued = true;
    return;
  }

  syncing = true;

  try {
    await mkdir(filesDestination, { recursive: true });
    await cp(htmlSource, destination, { recursive: true, force: true });

    const files = await readdir(source);
    await Promise.all(
      files
        .filter((file) => file.endsWith(".md") || file.endsWith(".csv"))
        .map((file) =>
          cp(path.join(source, file), path.join(filesDestination, file), {
            force: true,
          }),
        ),
    );

    await writeFile(reloadFile, `${Date.now()}\n`);
    console.log("[docs] Synced investor documents");
  } catch (error) {
    console.error("[docs] Sync failed", error);
  } finally {
    syncing = false;

    if (queued) {
      queued = false;
      void syncDocs();
    }
  }
}

await syncDocs();

const watcher = watch(source, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => void syncDocs(), 120);
});

function stop() {
  clearTimeout(timer);
  watcher.close();
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
