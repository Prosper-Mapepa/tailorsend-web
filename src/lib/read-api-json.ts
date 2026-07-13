/** Parse a fetch Response body safely — never throws on empty/invalid JSON. */
export async function readApiJson<T extends Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "Empty response from server."
        : res.status === 502 || res.status === 504
          ? "Server timed out. If you were uploading a resume, check Profile — your file may still be saved."
          : `Server error (${res.status}). If this persists, check DATABASE_URL and run migrations on production.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid server response (${res.status}). Please try again.`,
    );
  }
}
