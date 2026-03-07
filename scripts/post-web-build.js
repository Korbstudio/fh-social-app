const path = require('path')
const fs = require('fs')

const projectRoot = path.join(__dirname, '..')
const templateFile = path.join(
  projectRoot,
  'bskyweb',
  'templates',
  'scripts.html',
)
const assetManifestFile = path.join(
  projectRoot,
  'web-build',
  'asset-manifest.json',
)
const webIndexFile = path.join(projectRoot, 'web-build', 'index.html')

const ogSourceFile = path.join(
  projectRoot,
  'assets',
  'forum-xiii-hietzing-1200x630.png',
)
const ogTargetWebFile = path.join(
  projectRoot,
  'web-build',
  'static',
  'forum-xiii-hietzing-1200x630.png',
)
const ogTargetBskyFile = path.join(
  projectRoot,
  'bskyweb',
  'static',
  'forum-xiii-hietzing-1200x630.png',
)

const SITE_TITLE =
  'Forum XIII Hietzing – Das soziale Netzwerk für den 13. Wiener Gemeindebezirk, Hietzing'
const SITE_DESCRIPTION =
  'Forum XIII Hietzing ist das soziale Netzwerk für den 13. Wiener Gemeindebezirk, Hietzing. Entdecken Sie lokale Beiträge, Neuigkeiten, Diskussionen und Menschen aus Hietzing.'
const SITE_URL = 'https://forum-hietzing.at'
const OG_IMAGE_URL = `${SITE_URL}/static/forum-xiii-hietzing-1200x630.png`

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true})
}

function copyFile(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath))
  fs.copyFileSync(sourcePath, targetPath)
  console.log(`Copied ${sourcePath} to ${targetPath}`)
}

const {entrypoints} = require(assetManifestFile)

console.log(`Found ${entrypoints.length} entrypoints`)
console.log(`Writing ${templateFile}`)

const outputFile = entrypoints
  .map(name => {
    const file = path.basename(name)
    const ext = path.extname(file)

    if (ext === '.js') {
      return `<script defer="defer" src="{{ staticCDNHost }}/static/js/${file}"></script>`
    }
    if (ext === '.css') {
      return `<link rel="stylesheet" href="{{ staticCDNHost }}/static/css/${file}">`
    }

    return ''
  })
  .join('\n')

ensureDir(path.dirname(templateFile))
fs.writeFileSync(templateFile, outputFile)

function copyFiles(sourceDir, targetDir) {
  const absSourceDir = path.join(projectRoot, sourceDir)
  const absTargetDir = path.join(projectRoot, targetDir)

  if (!fs.existsSync(absSourceDir)) {
    console.log(`Skip missing directory ${absSourceDir}`)
    return
  }

  ensureDir(absTargetDir)

  const files = fs.readdirSync(absSourceDir)
  files.forEach(file => {
    const sourcePath = path.join(absSourceDir, file)
    const targetPath = path.join(absTargetDir, file)
    copyFile(sourcePath, targetPath)
  })
}

function copyOgImage() {
  if (!fs.existsSync(ogSourceFile)) {
    console.warn(`OG image source missing: ${ogSourceFile}`)
    return
  }

  copyFile(ogSourceFile, ogTargetWebFile)
  copyFile(ogSourceFile, ogTargetBskyFile)
}

function stripMeta(html) {
  const patterns = [
    /<meta name="description"[^>]*>/g,
    /<meta property="og:title"[^>]*>/g,
    /<meta name="twitter:title"[^>]*>/g,
    /<meta property="og:description"[^>]*>/g,
    /<meta name="twitter:description"[^>]*>/g,
    /<meta property="og:url"[^>]*>/g,
    /<meta name="twitter:url"[^>]*>/g,
    /<link rel="canonical"[^>]*>/g,
    /<meta property="og:image"[^>]*>/g,
    /<meta name="twitter:image"[^>]*>/g,
    /<meta property="twitter:image"[^>]*>/g,
    /<meta name="twitter:card"[^>]*>/g,
    /<meta name="apple-mobile-web-app-title"[^>]*>/g,
  ]

  let out = html
  for (const pattern of patterns) {
    out = out.replace(pattern, '')
  }
  return out
}

function injectForumMeta() {
  if (!fs.existsSync(webIndexFile)) {
    console.warn(`Missing ${webIndexFile}`)
    return
  }

  let html = fs.readFileSync(webIndexFile, 'utf8')
  html = stripMeta(html)

  if (!/<title>[\s\S]*?<\/title>/.test(html)) {
    throw new Error('No <title> tag found in web-build/index.html')
  }

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${SITE_TITLE}</title>`,
  )

  const forumMeta = [
    `<meta name="description" content="${SITE_DESCRIPTION}">`,
    `<meta property="og:title" content="${SITE_TITLE}">`,
    `<meta name="twitter:title" content="${SITE_TITLE}">`,
    `<meta property="og:description" content="${SITE_DESCRIPTION}">`,
    `<meta name="twitter:description" content="${SITE_DESCRIPTION}">`,
    `<meta property="og:url" content="${SITE_URL}">`,
    `<meta name="twitter:url" content="${SITE_URL}">`,
    `<link rel="canonical" href="${SITE_URL}">`,
    `<meta property="og:image" content="${OG_IMAGE_URL}">`,
    `<meta name="twitter:image" content="${OG_IMAGE_URL}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="apple-mobile-web-app-title" content="Forum XIII Hietzing">`,
  ].join('')

  html = html.replace('</title>', `</title>${forumMeta}`)
  fs.writeFileSync(webIndexFile, html)
  console.log(`Patched ${webIndexFile}`)
}

copyFiles('web-build/static/js', 'bskyweb/static/js')
copyFiles('web-build/static/css', 'bskyweb/static/css')
copyFiles('web-build/static/media', 'bskyweb/static/media')
copyOgImage()
injectForumMeta()
