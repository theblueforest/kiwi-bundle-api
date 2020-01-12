
export interface KiwiBundleOptions {
  dev: {
    webHost: string
    webPort: number
  }
  handlers: {
    [path: string]: string
  }
}
