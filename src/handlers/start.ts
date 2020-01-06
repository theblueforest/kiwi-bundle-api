import { KiwiBundleStartHandler } from "./.bundles/kiwi-bundle/handlers"
import { API } from "../core/api"

let CURRENT_API: any = null

export const main: KiwiBundleStartHandler = ({ handlers, options, version }) => {
  if(CURRENT_API === null) {
    CURRENT_API = new API(options.dev.webHost, options.dev.webPort, version, handlers)
  }
}
