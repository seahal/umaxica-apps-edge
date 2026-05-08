import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/image/route';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi
    .fn<() => { env: Record<string, unknown> }>()
    .mockReturnValue({ env: {} }),
}));

describe('com/core /api/image GET', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let originalAllowedImageHosts: string | undefined;

  beforeEach(() => {
    originalAllowedImageHosts = process.env.ALLOWED_IMAGE_HOSTS;
    process.env.ALLOWED_IMAGE_HOSTS = 'images.unsplash.com';
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    if (originalAllowedImageHosts === undefined) {
      delete process.env.ALLOWED_IMAGE_HOSTS;
    } else {
      process.env.ALLOWED_IMAGE_HOSTS = originalAllowedImageHosts;
    }
    vi.unstubAllGlobals();
  });

  it('returns 200 on the happy path (fallback when IMAGES binding is absent)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );

    const request = new NextRequest(
      'https://com.umaxica.com/api/image?url=https%3A%2F%2Fimages.unsplash.com%2Fa.png&w=100&q=80',
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
