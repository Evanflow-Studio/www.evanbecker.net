import { serverQueryContent } from '#content/server'
import { defineSitemapEventHandler } from '#imports'

const STATIC_PAGES: Array<{ loc: string; priority: number; changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly' }> = [
  { loc: '/', priority: 1.0, changefreq: 'weekly' },
  { loc: '/articles', priority: 0.9, changefreq: 'weekly' },
  { loc: '/about-me', priority: 0.7, changefreq: 'yearly' },
  { loc: '/contact', priority: 0.5, changefreq: 'yearly' },
  { loc: '/privacy-policy', priority: 0.3, changefreq: 'yearly' },
]

export default defineSitemapEventHandler(async (event) => {
  const articles = await serverQueryContent(event, 'articles')
    .where({ _draft: { $ne: true } })
    .find()

  const articleUrls = articles.map((article) => ({
    loc: article._path,
    lastmod: article.dateModified || article.date,
    changefreq: 'monthly' as const,
    priority: 0.8,
  }))

  // Use the freshest article date as a proxy for site freshness on static pages.
  const latest = articles.reduce(
    (max, a) => {
      const candidate = (a.dateModified as string) || (a.date as string) || ''
      return candidate > max ? candidate : max
    },
    '2026-01-01',
  )

  const staticUrls = STATIC_PAGES.map((p) => ({ ...p, lastmod: latest }))

  return [...staticUrls, ...articleUrls]
})
