import { KiwiBundleBuildHandler } from "../.bundles/kiwi-bundle/handlers"
import { WebpackCompiler } from "../core/WebpackCompiler"

export const main: KiwiBundleBuildHandler = ({ path, rootDir, handlers, outDir, packageJson }) => {
  const compiler = new WebpackCompiler(path, rootDir, handlers, outDir, packageJson)
  console.log("Webpack build...\n")
  compiler.build(() => {
    console.log(`Build done, you can now run \`node ${outDir}/server.js\`\n`)
  })
}
