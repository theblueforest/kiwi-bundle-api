import { API } from "./API"

export function Server(bundles: { [path: string]: string }) {
  new API(bundles)
}
