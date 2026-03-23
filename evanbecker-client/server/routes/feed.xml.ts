import { serverQueryContent } from '#content/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://www.evanbecker.net'

  const articles = await serverQueryContent(event, 'articles')
    .sort({ date: -1 })
    .find()

  const feedItems = articles
    .map((article) => {
      const link = `${siteUrl}/articles/${article._path?.replace('/articles/', '')}`
      const pubDate = article.date
        ? new Date(article.date).toUTCString()
        : new Date().toUTCString()

      return `    <item>
      <title><![CDATA[${article.title || ''}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${article.description || ''}]]></description>
    </item>`
    })
    .join('\n')

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Evan Becker</title>
    <link>${siteUrl}</link>
    <description>Articles on software architecture, game design, physics, and more.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems}
  </channel>
</rss>`

  setResponseHeader(event, 'content-type', 'application/xml')
  return feed
})
