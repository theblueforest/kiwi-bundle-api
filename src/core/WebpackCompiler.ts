import Webpack from "webpack"
import { Environment } from "dropin-recipes"
import { join } from "path"

export class WebpackCompiler {
  private path: string
  private rootDir: string
  private outDir: string
  private handlers: { [path: string]: string }

  constructor(path: string, rootDir: string, handlers: { [path: string]: string }, outDir: string) {
    this.path = path
    this.rootDir = rootDir
    this.outDir = outDir
    this.handlers = handlers
  }

  private getPlugins(env: Environment, handleBundle?: (bundle: any) => void) {
    const handlerPaths = Object.keys(this.handlers).reduce((result, handlerPath) => {
      if(typeof result[this.handlers[handlerPath]] === "undefined") {
        result[this.handlers[handlerPath]] = []
      }
      result[this.handlers[handlerPath]].push(handlerPath)
      return result
    }, {} as any)

    return [
      {
        apply: (compiler: Webpack.Compiler) => {
          compiler.hooks.emit.tap("kiwi-bundle-api", compilation => {
            const bundle = Array.from(compilation.entrypoints.keys()).reduce((result, handlerName) => {
              handlerPaths[handlerName].forEach((handlerPath: string) => {
                result[handlerPath] = compilation.entrypoints.get(handlerName).runtimeChunk.files[0]
              }, {} as any)
              return result
            }, {} as any)

            if(typeof handleBundle !== "undefined") {
              handleBundle(bundle)
            }

            if(env === Environment.PRODUCTION) {
              const bundleFile = JSON.stringify(bundle, null, 2)
              compilation.assets["bundle.json"] = {
                source: () => bundleFile,
                size: () => bundleFile.length,
              }
              const serverFile = `require("kiwi-bundle-api").KiwiBundleAPI(require("./bundle.json"));`
              compilation.assets["server.js"] = {
                source: () => serverFile,
                size: () => serverFile.length,
              }

            }
          })
        },
      },
    ]
  }

  private getOptions(env: Environment, handleBundle?: (bundle: any) => void): Webpack.Configuration {
    return {
      mode: env === Environment.PRODUCTION ? "production" : "development",
      entry: Object.values(this.handlers).reduce((result, handler) => {
        result[handler] = join(this.path, this.rootDir, handler + ".ts")
        return result
      }, {} as any),
      resolve: {
        extensions: [ ".ts" ],
      },
      module: {
        rules: [
          { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
        ],
      },
      target: "node",
      output: {
        filename: "[contenthash].js",
        path: join(this.path, this.outDir),
      },
      plugins: this.getPlugins(env, handleBundle),
    }
  }

  watch(onBuild: () => void, handleBundle: (bundle: any) => void) {
    Webpack(this.getOptions(Environment.DEVELOPMENT, handleBundle)).watch({}, (error, stats) => {
      onBuild()
    })
  }

  build(callback?: () => void) {
    Webpack(this.getOptions(Environment.PRODUCTION)).run((error, stats) => {
      if(typeof callback !== "undefined") {
        callback()
      }
    })
  }

}
