import Webpack from "webpack"
import { Environment } from "dropin-recipes"
import nodeExternals from "webpack-node-externals"
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

  private getPlugins(env: Environment, handleHandlers?: (bundle: any) => void) {
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
            const handlers = Array.from(compilation.entrypoints.keys()).reduce((result, handlerName) => {
              handlerPaths[handlerName].forEach((handlerPath: string) => {
                result[handlerPath] = compilation.entrypoints.get(handlerName).runtimeChunk.files[0]
              }, {} as any)
              return result
            }, {} as any)

            if(typeof handleHandlers !== "undefined") {
              handleHandlers(handlers)
            }

            if(env === Environment.PRODUCTION) {
              const bundleFile = JSON.stringify(handlers, null, 2)
              compilation.assets["bundle.json"] = {
                source: () => bundleFile,
                size: () => bundleFile.length,
              }
              const serverFile = `require("kiwi-bundle-api").KiwiBundleAPI(__dirname, require("./bundle.json"));`
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

  private getOptions(env: Environment, handleHandlers?: (bundle: any) => void): Webpack.Configuration {
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
          {
            test: /\.tsx?$/,
            use: "ts-loader",
            include: join(this.path, this.rootDir),
          },
        ],
      },
      target: "node",
      externals: [ nodeExternals() ],
      output: {
        filename: "[contenthash].js",
        path: join(this.path, this.outDir),
        libraryTarget: "umd",
      },
      plugins: this.getPlugins(env, handleHandlers),
    }
  }

  watch(onBuild: () => void, handleHandlers: (bundle: any) => void) {
    // TODO : delete old j.js files
    Webpack(this.getOptions(Environment.DEVELOPMENT, handleHandlers)).watch({}, (error, stats) => {
      if(error !== null) {
        console.error("[ERROR]", error, "\n")
        process.exit(1)
      } else if(stats.hasErrors()) {
        stats.compilation.errors.forEach(error => {
          console.error(error.message, "\n")
        })
      } else {
        onBuild()
      }
    })
  }

  build(callback?: () => void) {
    Webpack(this.getOptions(Environment.PRODUCTION)).run((error, stats) => {
      if(error !== null) {
        console.error("[ERROR]", error, "\n")
      } else if(stats.hasErrors()) {
        stats.compilation.errors.forEach(error => {
          console.error(error.message, "\n")
        })
        process.exit(1)
      } else if(typeof callback !== "undefined") {
        callback()
      }
    })
  }

}
