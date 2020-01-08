import { KiwiBundleStartHandler } from "./.bundles/kiwi-bundle/handlers"
import Webpack from "webpack"
import { join } from "path"

let CURRENT_API: any = null

export const main: KiwiBundleStartHandler = ({ path, rootDir, handlers, options, version }) => {
  if(CURRENT_API === null) {
    Webpack({
      mode: "production",
      entry: Object.values(handlers).reduce((result, handler) => {
        result[handler] = join(path, rootDir, handler + ".ts")
        return result
      }, {} as any),
      module: {
        rules: [
          { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
        ],
      },
      resolve: {
        extensions: [ ".ts" ],
      },
      target: "node",
      output: {
        filename: "[contenthash].js",
        path: join(path, "dist"),
      },
      plugins: [
        {
          apply: (compiler: Webpack.Compiler) => {
            compiler.hooks.emit.tap("kiwi-bundle-api", compilation => {
              const handlerPaths = Object.keys(handlers).reduce((result, handlerPath) => {
                if(typeof result[handlers[handlerPath]] === "undefined") {
                  result[handlers[handlerPath]] = []
                }
                result[handlers[handlerPath]].push(handlerPath)
                return result
              }, {} as any)

              const bundlesFile = JSON.stringify(Array.from(compilation.entrypoints.keys()).reduce((result, handlerName) => {
                handlerPaths[handlerName].forEach((handlerPath: string) => {
                  result[handlerPath] = compilation.entrypoints.get(handlerName).runtimeChunk.files[0]
                }, {} as any)
                return result
              }, {} as any), null, 2)
              compilation.assets["bundles.json"] = {
                source: () => bundlesFile,
                size: () => bundlesFile.length,
              }

              const serverFile = `require("kiwi-bundle-api").Server(require("./bundles.json"));`
              compilation.assets["server.js"] = {
                source: () => serverFile,
                size: () => serverFile.length,
              }
            })
          },
        },
      ]
    }).watch({}, (error, stats) => {
        console.log(error)
    })
    // CURRENT_API = new API(options.dev.webHost, options.dev.webPort, version, handlers)
  }
}
