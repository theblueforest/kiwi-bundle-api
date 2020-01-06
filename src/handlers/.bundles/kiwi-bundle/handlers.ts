import { KiwiBundleOptions } from "./options"

export type KiwiBundleHandlerParamsHandlers = {
  [path: string]: {
    path: string
    params: string[]
  }
}

interface KiwiBundleHandlerParams {
  version: string
  options: KiwiBundleOptions
  handlers: KiwiBundleHandlerParamsHandlers
}

export type KiwiBundleStartHandler = (params: KiwiBundleHandlerParams) => void

export type KiwiBundleBuildHandler = (params: KiwiBundleHandlerParams) => void
