type ArticleSchemaData = {
  title: string
  description?: string
  date?: string
  dateModified?: string
  image?: string
  tags?: string[]
  path: string
  wordCount?: number
}

function siteRoot(): string {
  const config = useRuntimeConfig()
  return (config.public.siteUrl as string).replace(/\/$/, '')
}

function personSchema(siteUrl: string) {
  return {
    '@type': 'Person',
    '@id': `${siteUrl}/#person`,
    name: 'Evan Becker',
    url: siteUrl,
    jobTitle: 'Senior Technical Architect',
    sameAs: [
      'https://www.linkedin.com/in/evanbeckerdotnet/',
      'https://github.com/evanjbecker',
      'https://gitlab.com/evanbecker',
    ],
  }
}

export function useWebSiteSchema() {
  const siteUrl = siteRoot()

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Evan Becker',
        description: 'Software architect, writer, and builder of things.',
        publisher: { '@id': `${siteUrl}/#person` },
        inLanguage: 'en-US',
      },
      personSchema(siteUrl),
    ],
  }

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(graph),
        key: 'website-schema',
      },
    ],
  })
}

export function useArticleSchema(article: ArticleSchemaData) {
  const siteUrl = siteRoot()
  const articleUrl = `${siteUrl}${article.path}`
  const imageUrl = article.image
    ? `${siteUrl}${article.image}`
    : `${siteUrl}/og-image.png`

  const articleGraph: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: imageUrl,
    author: { '@id': `${siteUrl}/#person` },
    publisher: { '@id': `${siteUrl}/#person` },
    datePublished: article.date,
    dateModified: article.dateModified || article.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    inLanguage: 'en-US',
  }

  if (article.tags?.length) {
    articleGraph.keywords = article.tags.join(', ')
    articleGraph.articleSection = article.tags[0]
  }

  if (article.wordCount && article.wordCount > 0) {
    articleGraph.wordCount = article.wordCount
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${siteUrl}/articles` },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
    ],
  }

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(articleGraph),
        key: 'article-schema',
      },
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(breadcrumbs),
        key: 'article-breadcrumb',
      },
    ],
  })
}
