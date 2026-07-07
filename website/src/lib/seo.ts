export const siteUrl = "https://snapengine.dev";
export const siteName = "SnapEngineJS";
export const defaultTitle = "SnapEngineJS | Interactivity engine for the web";
export const defaultDescription =
  "SnapEngine is an interactivity engine for building draggable, animated, collision-aware web experiences.";
export const defaultImage = "/images/thumbnail.png";
export const defaultImageWidth = "1200";
export const defaultImageHeight = "627";

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

export function canonicalPath(path: string) {
  if (!path || path === "/") return "/";

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function pageTitle(title: string) {
  return title.includes(siteName) ? title : `${title} | ${siteName}`;
}
