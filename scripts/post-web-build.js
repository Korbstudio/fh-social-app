const path = require('path')
const fs = require('fs')

const projectRoot = path.join(__dirname, '..')
const templateFile = path.join(
  projectRoot,
  'bskyweb',
  'templates',
  'scripts.html',
)

const {entrypoints} = require(
  path.join(projectRoot, 'web-build/asset-manifest.json'),
)

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
fs.writeFileSync(templateFile, outputFile)

function copyFiles(sourceDir, targetDir) {
  const files = fs.readdirSync(path.join(projectRoot, sourceDir))
  files.forEach(file => {
    const sourcePath = path.join(projectRoot, sourceDir, file)
    const targetPath = path.join(projectRoot, targetDir, file)
    fs.copyFileSync(sourcePath, targetPath)
    console.log(`Copied ${sourcePath} to ${targetPath}`)
  })
}

copyFiles('web-build/static/js', 'bskyweb/static/js')
copyFiles('web-build/static/css', 'bskyweb/static/css')
copyFiles('web-build/static/media', 'bskyweb/static/media')

/*FH_BRANDING_V1*/
try {
  const fs = require('fs')
  const path = require('path')

  const BRAND_TITLE = process.env.FH_BRAND_TITLE || 'Forum Hietzing'
  const BRAND_DESC =
    process.env.FH_BRAND_DESC ||
    'Das soziale Netzwerk für den 13. Wiener Gemeindebezirk, Hietzing.'

  // Patch index.html <title> + apple web app title
  const indexPath = path.resolve(__dirname, '..', 'web-build', 'index.html')
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8')
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${BRAND_TITLE}</title>`,
    )
    html = html.replace(
      /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
      `$1${BRAND_TITLE}$2`,
    )
    fs.writeFileSync(indexPath, html)
  }

  // Patch manifest.json name/short_name/description
  const manifestPath = path.resolve(
    __dirname,
    '..',
    'web-build',
    'manifest.json',
  )
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    m.name = BRAND_TITLE
    m.short_name = BRAND_TITLE
    m.description = BRAND_DESC
    fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2))
  }
} catch (e) {
  console.warn('FH branding patch failed:', e && e.message ? e.message : e)
}
