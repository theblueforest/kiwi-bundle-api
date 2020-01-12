import { KiwiBundleOptions } from "./options"

interface KiwiBundleHandlerParams {
  path: string
  rootDir: string
  outDir: string
  version: string
  options: KiwiBundleOptions
  handlers: { [path: string]: string }
  packageJson: any
}

export type KiwiBundleStartHandler = (params: KiwiBundleHandlerParams) => void

export type KiwiBundleBuildHandler = (params: KiwiBundleHandlerParams) => void
