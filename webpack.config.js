const createExpoWebpackConfigAsync = require('@expo/webpack-config')

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv)

  // 1) .cjs soll als JS gelten (CommonJS), nicht als Asset
  config.module.rules.unshift({
    test: /\.cjs$/,
    type: 'javascript/auto',
  })

  // 2) sicherstellen, dass Asset-Rule .cjs NICHT frisst
  for (const rule of config.module.rules) {
    if (!rule.oneOf) continue
    for (const one of rule.oneOf) {
      const isAsset =
        one.type === 'asset/resource' ||
        one.type === 'asset' ||
        (typeof one.loader === 'string' && one.loader.includes('file-loader'))
      if (!isAsset) continue

      if (one.exclude) {
        one.exclude = Array.isArray(one.exclude) ? one.exclude : [one.exclude]
        one.exclude.push(/\.cjs$/)
      } else {
        one.exclude = [/\.cjs$/]
      }
    }
  }

  // 3) resolve: .cjs erlauben
  if (
    config.resolve &&
    Array.isArray(config.resolve.extensions) &&
    !config.resolve.extensions.includes('.cjs')
  ) {
    config.resolve.extensions.push('.cjs')
  }

  return config
}
