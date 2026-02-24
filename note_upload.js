import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";
import { CohereClient } from "cohere-ai";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Upload all notes from a local folder into Supabase, with Cohere embeddings.
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   COHERE_API_KEY
 *
 * Optional env vars:
 *   NOTES_DIR            (default: ./notes)
 *   SUPABASE_TABLE       (default: documents)
 *   COHERE_EMBED_MODEL   (default: embed-english-v3.0)
 *   COHERE_INPUT_TYPE    (default: search_document)
 *   EMBED_BATCH_SIZE     (default: 48)
 *   UPSERT_ON_FILENAME   (default: true)  // requires a unique constraint on metadata->>'name' or a dedicated column
 */

const NOTES_DIR = process.env.NOTES_DIR
  ? path.resolve(process.env.NOTES_DIR)
  : path.resolve(process.cwd(), "notes");

const SUPABASE_TABLE = process.env.SUPABASE_TABLE ?? "documents";
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL ?? "embed-english-v3.0";
const COHERE_INPUT_TYPE = process.env.COHERE_INPUT_TYPE ?? "search_document";
const EMBED_BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE ?? 48);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

/**
 * Determine whether a file extension is considered a supported text format.
 *
 * @param {string} ext - File extension including the leading dot (e.g. ".md").
 * @returns {boolean} True if the extension is in the supported set.
 */
function isProbablyTextFile(ext) {
  // Expand this list as needed to support additional file types
  return new Set([
    ".pdf",
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".csv",
    ".ts",
    ".js",
    ".jsx",
    ".tsx",
    ".py",
    ".html",
    ".css",
    ".yml",
    ".yaml",
    ".log",
  ]).has(ext.toLowerCase());
}

/**
 * Recursively list all file paths under a directory.
 *
 * @param {string} dir - Absolute path of the root directory to walk.
 * @returns {Promise<string[]>} Flat array of absolute file paths.
 */
async function listFilesRecursively(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {  // Recurse into subdirectories to collect nested files
      out.push(...(await listFilesRecursively(full)));
    } else if (ent.isFile()) {  // Collect regular files; skip symlinks and other special entries
      out.push(full);
    }
  }
  return out;
}

/**
 * Split an array into fixed-size chunks for batch processing.
 *
 * @template T
 * @param {T[]} arr  - Source array.
 * @param {number} size - Maximum number of elements per chunk.
 * @returns {T[][]} Array of sub-arrays, each at most `size` elements long.
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));  // Advance by `size` each iteration to produce non-overlapping windows
  return chunks;
}

/**
 * Main upload pipeline.
 *
 * Steps:
 *  1. Recursively scan NOTES_DIR for supported text files.
 *  2. Embed document content in batches via the Cohere Embed API.
 *  3. Insert (or upsert) rows into the configured Supabase table.
 *
 * @returns {Promise<void>}
 * @throws {Error} If required environment variables are missing or any
 *   network call fails.
 */
async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in env");
  }
  if (!process.env.COHERE_API_KEY) {
    throw new Error("Missing COHERE_API_KEY in env");
  }

  // 1) Read files
  const allPaths = await listFilesRecursively(NOTES_DIR);
  const textPaths = allPaths.filter((p) => isProbablyTextFile(path.extname(p)));

  if (textPaths.length === 0) {
    console.log(`No supported text files found in: ${NOTES_DIR}`);
    return;
  }

  console.log(`Found ${textPaths.length} text files under ${NOTES_DIR}`);

  const docs = [];
  for (const filePath of textPaths) {  // Build the docs array from all readable, non-empty files
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);

    // Read as UTF-8 text; skip files that fail decoding
    let content;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch (e) {  // Skip files with permission errors or binary content that can't be decoded
      console.warn(`Skipping (read error): ${filePath}`, e?.message ?? e);
      continue;
    }

    // Skip empty files
    if (!content || content.trim().length === 0) continue;  // Don't waste embed calls on blank documents

    const metadata = {
      name,
      fileType: ext.replace(".", ""),
      relativePath: path.relative(NOTES_DIR, filePath),
    };

    docs.push({ content, metadata });
  }

  if (docs.length === 0) {
    console.log("No non-empty text files to upload.");
    return;
  }

  // 2) Embed in batches
  console.log(
    `Embedding ${docs.length} documents with Cohere model '${COHERE_EMBED_MODEL}' (batch=${EMBED_BATCH_SIZE})...`
  );

  const docChunks = chunkArray(docs, Math.max(1, EMBED_BATCH_SIZE));
  const rowsToInsert = [];

  for (let i = 0; i < docChunks.length; i++) {  // Process each batch independently to stay within Cohere's input size limits
    const batch = docChunks[i];
    const texts = batch.map((d) => d.content);  // Extract raw text strings for the Cohere embedding API

    const embedResp = await cohere.embed({
      texts,
      model: COHERE_EMBED_MODEL,
      inputType: COHERE_INPUT_TYPE,
    });

    // SDK returns embeddings in `embeddings` for v2 embed
    const embeddings = embedResp.embeddings;
    if (!embeddings || embeddings.length !== batch.length) {  // Validate the API returned exactly one vector per document
      throw new Error(
        `Unexpected embedding response: got ${embeddings?.length} for batch size ${batch.length}`
      );
    }

    for (let j = 0; j < batch.length; j++) {  // Pair each document with its corresponding embedding vector
      rowsToInsert.push({
        content: batch[j].content,
        metadata: batch[j].metadata,
        embedding: embeddings[j],
      });
    }

    console.log(`Embedded batch ${i + 1}/${docChunks.length}`);
  }

  // 3) Insert (or upsert) into Supabase
  console.log(`Uploading ${rowsToInsert.length} rows into Supabase table '${SUPABASE_TABLE}'...`);

  // NOTE: Upsert requires a UNIQUE constraint on the conflict target.
  // If you want to upsert by filename, the cleanest approach is adding a dedicated column (e.g. `doc_name text unique`).
  const UPSERT_ON_FILENAME = (process.env.UPSERT_ON_FILENAME ?? "true").toLowerCase() === "true";

  // Insert in chunks to avoid request size limits
  const insertChunks = chunkArray(rowsToInsert, 100);

  for (let i = 0; i < insertChunks.length; i++) {  // Upload rows in chunks to avoid Supabase request size limits
    const chunk = insertChunks[i];

    const query = UPSERT_ON_FILENAME
      ? supabase.from(SUPABASE_TABLE).upsert(chunk, {
          // Change this if you add a dedicated unique column.
          // For JSONB metadata, Postgres can't target metadata->>'name' via PostgREST conflict.
          // So by default we just do normal insert unless you set a real conflict target.
          // You can set UPSERT_ON_FILENAME=false to avoid confusion.
          onConflict: "id",
        })
      : supabase.from(SUPABASE_TABLE).insert(chunk);  // Plain insert when upsert is disabled

    const { error } = await query;
    if (error) throw error;  // Bubble up Supabase errors immediately

    console.log(`Uploaded chunk ${i + 1}/${insertChunks.length}`);
  }

  console.log("Done ✅");
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
