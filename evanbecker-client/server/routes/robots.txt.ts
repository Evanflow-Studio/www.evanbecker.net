export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || ''
  const isProduction = siteUrl === 'https://www.evanbecker.net'

  setResponseHeader(event, 'content-type', 'text/plain')

  if (!isProduction) {
    return `User-agent: *
Disallow: /
`
  }

  return `User-agent: *
Allow: /
Disallow: /account
Disallow: /thank-you-message

Sitemap: ${siteUrl}/sitemap.xml
`
})
