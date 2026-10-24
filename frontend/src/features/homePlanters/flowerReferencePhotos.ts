/**
 * Commons photo-reference search. Neither botanical ID nor disease labels are
 * inferred from title search. Only openly licensed images are displayed, with
 * links to each source for attribution and license information.
 */
export type CommonsPhoto = Readonly<{
  src: string;
  pageUrl: string;
  title: string;
  license: string;
  licenseUrl: string | null;
  credit: string;
}>;

type PageInfo = {
  title?: unknown;
  canonicalurl?: unknown;
  imageinfo?: Array<{
    thumburl?: unknown;
    url?: unknown;
    descriptionurl?: unknown;
    mime?: unknown;
    extmetadata?: Record<string, { value?: unknown }>;
  }>;
};

const API = "https://commons.wikimedia.org/w/api.php";
const SAFE_LICENSE = /^(?:cc0|public domain)$/i;

function parseLicense(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plain = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  const normalized = plain.toLowerCase().replace(/[\s.-]/g, "");
  const usable = SAFE_LICENSE.test(plain) || /^ccby(?:sa)?(?:[1-4]0?)?$/.test(normalized);
  return usable ? plain.slice(0, 90) : null;
}

function safeHttps(value: unknown, hosts: readonly string[]): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && hosts.includes(parsed.hostname) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function textCredit(value: unknown): string {
  if (typeof value !== "string") return "See original file page for attribution";
  // Commons metadata sometimes contains HTML attribution markup; never inject HTML.
  const plain = value.replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot);/gi, " ").replace(/\s+/g, " ").trim();
  return plain.slice(0, 140) || "See original file page for attribution";
}

export function photosFromCommonsResponse(payload: unknown): CommonsPhoto[] {
  if (!payload || typeof payload !== "object") return [];
  const query = (payload as { query?: { pages?: Record<string, PageInfo> } }).query;
  if (!query?.pages || typeof query.pages !== "object") return [];
  const output: CommonsPhoto[] = [];
  const seen = new Set<string>();
  for (const page of Object.values(query.pages)) {
    const info = page.imageinfo?.[0];
    if (!info || !String(info.mime ?? "").startsWith("image/")) continue;
    const source = safeHttps(info.thumburl ?? info.url, ["upload.wikimedia.org"]);
    const original = safeHttps(info.descriptionurl ?? page.canonicalurl, ["commons.wikimedia.org"]);
    const license = parseLicense(info.extmetadata?.LicenseShortName?.value);
    if (!source || !original || !license || seen.has(source)) continue;
    // Formats displayable in current Android WebViews; exclude SVG and documents.
    if (!/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(new URL(source).pathname)) continue;
    seen.add(source);
    const licenseUrl = safeHttps(info.extmetadata?.LicenseUrl?.value, ["creativecommons.org"]);
    if (!licenseUrl && !SAFE_LICENSE.test(license)) continue;
    output.push({
      src: source, pageUrl: original,
      title: typeof page.title === "string" ? page.title.replace(/^File:/, "").slice(0, 100) : "Commons reference photo",
      license, licenseUrl,
      credit: textCredit(info.extmetadata?.Artist?.value ?? info.extmetadata?.Credit?.value),
    });
  }
  return output;
}

export async function findLicensedReferencePhotos(search: string, signal: AbortSignal): Promise<CommonsPhoto[]> {
  const term = search.trim().slice(0, 105);
  if (term.length < 3) return [];
  const args = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: `${term} flower plant`,
    gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo",
    iiprop: "url|mime|extmetadata", iiurlwidth: "580", format: "json", origin: "*",
  });
  const response = await fetch(`${API}?${args.toString()}`, { signal, mode: "cors" });
  if (!response.ok) throw new Error(`Commons returned HTTP ${response.status}`);
  return photosFromCommonsResponse(await response.json());
}
