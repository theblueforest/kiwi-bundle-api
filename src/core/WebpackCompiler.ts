import Webpack from "webpack"
import { Environment } from "dropin-recipes"
import nodeExternals from "webpack-node-externals"
import { join } from "path"
import fs from "fs"

export class WebpackCompiler {
  private path: string
  private rootDir: string
  private outDir: string
  private handlers: { [path: string]: string }
  private cache: { [path: string]: string } = {}
  packageJson: any

  constructor(path: string, rootDir: string, handlers: { [path: string]: string }, outDir: string, packageJson: any) {
    this.path = path
    this.rootDir = rootDir
    this.outDir = outDir
    this.handlers = handlers
    this.packageJson = packageJson
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
            let cache: any = { dependencies: {} }

            const handlers = Array.from(compilation.entrypoints.keys()).reduce((result, handlerName) => {
              handlerPaths[handlerName].forEach((handlerPath: string) => {
                const runtimeChunk = compilation.entrypoints.get(handlerName).runtimeChunk
                result[handlerPath] = runtimeChunk.files[0]
                cache.dependencies[result[handlerPath]] = Array.from(runtimeChunk._modules).reduce((modules: string[], currentModule: any) => {
                  if(currentModule.type === "javascript/dynamic") {
                    modules.push(currentModule.request)
                  }
                  return modules
                }, [])
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

              const packagesToInclude = Object.values(cache.dependencies).reduce((result: string[], dependencies) => {
                (dependencies as string[]).forEach(dependency => {
                  if(result.indexOf(dependency) === -1) {
                    result.push(dependency)
                  }
                })
                return result
              }, [] as any)
              const packageFile = JSON.stringify({
                name: this.packageJson.name,
                version: this.packageJson.version,
                scripts: { start: "node server.js" },
                dependencies: Object.keys(this.packageJson.dependencies || {}).reduce((result: any, packageName) => {
                  if(packagesToInclude.indexOf(packageName) !== -1) {
                    result[packageName] = this.packageJson.dependencies[packageName]
                  }
                  return result
                }, {}),
              }, null, 2)
              compilation.assets["package.json"] = {
                source: () => packageFile,
                size: () => packageFile.length,
              }

              const cacheFile = JSON.stringify(cache)
              compilation.assets["cache.json"] = {
                source: () => cacheFile,
                size: () => cacheFile.length,
              }

            } else if(env === Environment.DEVELOPMENT) {
              const cacheHandlers: string[] = Object.values(handlers)
              Object.values(this.cache).forEach(handlerName => {
                if(cacheHandlers.indexOf(handlerName) === -1) {
                  fs.unlinkSync(join(this.path, this.outDir, handlerName))
                }
              })
              this.cache = handlers
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
      plugins: this.getPlugins(env, handleHandlers),
      target: "node",
      externals: [
        nodeExternals({ modulesFromFile: true }),
      ],
      output: {
        filename: "[contenthash].js",
        path: join(this.path, this.outDir),
        libraryTarget: "umd",
      },
    }
  }

  watch(onBuild: () => void, handleHandlers: (bundle: any) => void) {
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
        process.exit(1)
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
