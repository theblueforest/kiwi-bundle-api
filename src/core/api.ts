import http from "http"
import { KiwiBundleHandlerParamsHandlers } from "../handlers/.bundles/kiwi-bundle/handlers"

export class API {

  constructor(hostname: string, port: number, version: string, handlers: KiwiBundleHandlerParamsHandlers) {
    http.createServer((request, response) => {
      let handler = null
      const paths = Object.keys(handlers)
      let lastIndex = 0
      for(; lastIndex < paths.length; lastIndex++) {
        handler = new RegExp(paths[lastIndex]).exec(request.url as string)
        if(handler !== null) break
      }
      if(handler === null) {
        response.writeHead(404, { "Content-Type": "text/plain" })
        response.write("404 Not found")
      } else {
        const handlerData = handlers[paths[lastIndex]]
        const params = handler.slice(1).reduce((result, value, index) => {
          result[handlerData.params[index]] = value
          return result
        }, {} as any)
        response.writeHead(200, { "Content-Type": "application/json" })
        response.write(JSON.stringify({
          file: handlerData.path,
          params,
        }))
      }
      response.end()
    }).listen(port, hostname, () => {
      console.log(`Server now available on http://${hostname}:${port}/${version}\n`)
    })
  }
}
