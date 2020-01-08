import { API } from "./API"

export function KiwiBundleAPI(bundle: { [path: string]: string }) {
  const api = new API(bundle)
  api.start()
}
