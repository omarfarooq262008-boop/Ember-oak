import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function getRobotsTxt(siteUrl: string) {
  return `User-agent: *
Disallow: /admin
Disallow: /admin/
Disallow: /mock-checkout
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
}

function getSitemapXml(siteUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/collections</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${siteUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${siteUrl}/shipping</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/returns</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${siteUrl}/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${siteUrl}/track-order</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
</urlset>
`
}

function seoPlugin(siteUrl: string): Plugin {
  return {
    name: 'vite-plugin-seo',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(getRobotsTxt(siteUrl))
          return
        }
        if (req.url === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.end(getSitemapXml(siteUrl))
          return
        }
        next()
      })
    },
    closeBundle() {
      const distDir = path.resolve(rootDir, 'dist')
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.resolve(distDir, 'robots.txt'), getRobotsTxt(siteUrl), 'utf-8')
        fs.writeFileSync(path.resolve(distDir, 'sitemap.xml'), getSitemapXml(siteUrl), 'utf-8')
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (
    process.env.VITE_SITE_URL ||
    env.VITE_SITE_URL ||
    'https://emberandoak.pk'
  ).replace(/\/+$/, '')

  return {
    plugins: [react(), tailwindcss(), seoPlugin(siteUrl)],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    // Vercel injects these at build time; expose them for Sentry release/environment.
    define: {
      'import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA': JSON.stringify(
        process.env.VERCEL_GIT_COMMIT_SHA ?? '',
      ),
      'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(
        process.env.VERCEL_ENV ?? '',
      ),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase'
              if (id.includes('react-router')) return 'router'
              if (id.includes('react-dom') || id.includes('/react/')) return 'react'
            }
          },
        },
      },
    },
  }
})
