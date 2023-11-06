import rehypePrism from '@mapbox/rehype-prism'
import nextMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'md', 'ts', 'tsx', 'mdx'],
    rewrites: async () => [
        {
            source: "/privacy-policy",
            destination: "/privacy-policy.html"
        }
    ]
}

const withMDX = nextMDX({
    extension: /\.mdx?$/,
    options: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypePrism],
    }
});

export default withMDX(nextConfig)
