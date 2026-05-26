import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://umaxica.org',
      lastModified: '2021-01-01',
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];
}
