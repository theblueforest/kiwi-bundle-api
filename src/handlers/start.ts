import { join } from "path"
import { KiwiBundleStartHandler } from "../.bundles/kiwi-bundle/handlers"
import { WebpackCompiler } from "../core/WebpackCompiler"
import { API } from "../core/API"

export const main: KiwiBundleStartHandler = ({ path, rootDir, handlers, outDir, options, packageJson }) => {
  let isWebpackStarted = false
  let isServerStarted = false

  // Server
  const api = new API(join(path, outDir))

  // Webpack
  console.log("Webpack is starting...\n")
  const webpack = new WebpackCompiler(path, rootDir, handlers, outDir, packageJson)
  webpack.watch(() => {
    if(!isWebpackStarted) {
      console.log("[OK] Webpack is now waiting for updates\n")
      isWebpackStarted = true
    }
    console.log("[OK] Build done\n")
  }, handlers => {
    api.setHandlers(handlers)
    if(!isServerStarted) {
      api.start(options.dev.webPort, options.dev.webHost, () => {
        console.log(`[OK] API available on http://${options.dev.webHost}:${options.dev.webPort}/...\n`)
      })
      isServerStarted = true
    }
  })

}
