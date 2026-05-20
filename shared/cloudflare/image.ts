export const DEFAULT_ALLOWED_IMAGE_HOSTS = 'images.unsplash.com, avatars.githubusercontent.com';
export const MAX_IMAGE_WIDTH = 4096;
export const MIN_IMAGE_QUALITY = 1;
export const MAX_IMAGE_QUALITY = 100;
export const MAX_IMAGE_SOURCE_BYTES = 10 * 1024 * 1024;

export interface ImageTransformOptions {
  width?: number;
  quality?: number;
}

export function normalizeHostnames(rawHostnames: string | undefined): Set<string> {
  const hostnames = rawHostnames
    ? rawHostnames
        .split(',')
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return new Set(hostnames);
}

function isAllowedOrigin(requestUrl: string, parsedUrl: URL): boolean {
  const requestOrigin = new URL(requestUrl).origin.toLowerCase();
  return parsedUrl.origin.toLowerCase() === requestOrigin;
}

/**
 * Resolves and validates a user-provided image URL before it is fetched server-side.
 *
 * Relative URLs are resolved against the current request URL so local next/image
 * sources like `/logo.png` keep working.
 */
export function validateImageUrl(
  rawUrl: string,
  requestUrl: string,
  allowedHostnamesValue: string | undefined = process.env.ALLOWED_IMAGE_HOSTS ??
    DEFAULT_ALLOWED_IMAGE_HOSTS,
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, requestUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }

  if (isAllowedOrigin(requestUrl, parsed)) {
    return parsed.toString();
  }

  const allowedHostnames = normalizeHostnames(allowedHostnamesValue);
  if (!allowedHostnames.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  return parsed.toString();
}

export function isAllowedImageFetchTarget(
  candidateUrl: string,
  requestUrl: string,
  allowedHostnamesValue: string | undefined = process.env.ALLOWED_IMAGE_HOSTS ??
    DEFAULT_ALLOWED_IMAGE_HOSTS,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    return false;
  }

  if (isAllowedOrigin(requestUrl, parsed)) {
    return true;
  }

  const allowedHostnames = normalizeHostnames(allowedHostnamesValue);
  return allowedHostnames.has(parsed.hostname.toLowerCase());
}

function parseOptionalBoundedInteger(
  rawValue: string | null,
  minValue: number,
  maxValue: number,
): number | null | undefined {
  if (rawValue === null) {
    return undefined;
  }

  if (!/^\d+$/.test(rawValue)) {
    return null;
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minValue || value > maxValue) {
    return null;
  }

  return value;
}

export function parseImageTransformOptions(
  widthValue: string | null,
  qualityValue: string | null,
): ImageTransformOptions | null {
  const width = parseOptionalBoundedInteger(widthValue, 1, MAX_IMAGE_WIDTH);
  if (width === null) {
    return null;
  }

  const quality = parseOptionalBoundedInteger(qualityValue, MIN_IMAGE_QUALITY, MAX_IMAGE_QUALITY);
  if (quality === null) {
    return null;
  }

  const options: ImageTransformOptions = {};
  if (width !== undefined) {
    options.width = width;
  }
  if (quality !== undefined) {
    options.quality = quality;
  }

  return options;
}

export function isAllowedImageSourceSize(
  contentLengthValue: string | null,
  maxBytes: number = MAX_IMAGE_SOURCE_BYTES,
): boolean {
  if (contentLengthValue === null) {
    return true;
  }

  if (!/^\d+$/.test(contentLengthValue)) {
    return false;
  }

  const contentLength = Number(contentLengthValue);
  return Number.isSafeInteger(contentLength) && contentLength <= maxBytes;
}
