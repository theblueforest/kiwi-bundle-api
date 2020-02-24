import { join } from "path"
import dotenv from "dotenv"
import { KiwiBundleStartHandler } from "../.bundles/kiwi-bundle/handlers"
import { WebpackCompiler } from "../core/WebpackCompiler"
import { API } from "kiwi-bundle-api-runtime"

export const main: KiwiBundleStartHandler = ({ path, rootDir, handlers, outDir, options, packageJson }) => {
  let isWebpackStarted = false
  let isServerStarted = false

  // Server
  const api = new API(join(path, outDir))

  // Environment variables
  dotenv.config()

  // Webpack
  console.log("Webpack is starting...")
  const webpack = new WebpackCompiler(path, rootDir, handlers, outDir, packageJson)
  webpack.watch(() => {
    if(isWebpackStarted) {
    } else {
      console.log("\n[OK] Webpack is now waiting for updates")
      isWebpackStarted = true
    }
    console.log("\n[OK] Build done")
  }, handlers => {
    api.setHandlers(handlers)
    if(!isServerStarted) {
      api.start(options.dev.webPort, options.dev.webHost, () => {
        console.log(`\n[OK] API available on http://${options.dev.webHost}:${options.dev.webPort}/`)
      })
      isServerStarted = true
    }
  })

}
