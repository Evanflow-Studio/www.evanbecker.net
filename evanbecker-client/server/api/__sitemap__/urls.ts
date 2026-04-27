import { serverQueryContent } from '#content/server'
import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(async (event) => {
  const articles = await serverQueryContent(event, 'articles')
    .where({ _draft: { $ne: true } })
    .find()

  return articles.map((article) => ({
    loc: article._path,
    lastmod: article.date,
    changefreq: 'monthly',
    priority: 0.8,
  }))
})
