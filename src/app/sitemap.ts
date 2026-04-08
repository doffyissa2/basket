import type { MetadataRoute } from 'next'

const BASE = 'https://basketbeta.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: BASE,                                    lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/carte`,                         lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/comment-ca-marche`,             lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/basket-ai`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/login`,                         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/vision`,                        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contact`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`,                       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,                         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
