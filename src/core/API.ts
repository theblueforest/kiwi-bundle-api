import http from "http"

export type APIHandlers = {
  [path: string]: {
    path: string
    params: string[]
  }
}

export class API {
  private handlers: APIHandlers = {}

  setHandlers(handlers: { [path: string]: string }) {
    this.handlers = Object.keys(handlers).reduce((result, handlerPath) => {
      let regexPath = handlerPath.replace(/\{.*?\}/g, "([A-Za-z0-9]+)")
      if(regexPath.charAt(regexPath.length - 1) === "/") regexPath += "?"
      result["^" + regexPath + "$"] = {
        path: handlers[handlerPath],
        params: handlerPath.match(/\{.*?\}/g)?.map(c => c.slice(1, -1)) || [],
      }
      return result
    }, {} as APIHandlers)
  }

  private requestListener(request: http.IncomingMessage, response: http.ServerResponse) {
    let output = null

    const paths = Object.keys(this.handlers)
    for(let i = 0; i < paths.length; i++) {
      const handlerRegex = new RegExp(paths[i]).exec(request.url as string)
      if(handlerRegex !== null) {
        const handler = this.handlers[paths[i]]
        output = {
          path: handler.path,
          params: handler.params.reduce((result, key, index) => {
            result[key] = handlerRegex[index + 1]
            return result
          }, {} as any)
        }
        break
      }
    }

    if(output === null) {
      response.writeHead(404, { "Content-Type": "text/plain" })
      response.write("404 Not found")
    } else {
      response.writeHead(200, { "Content-Type": "application/json" })
      response.write(JSON.stringify(output))
    }
    response.end()
  }

  start(port = 8080, hostname = "0.0.0.0", callback?: () => void) {
    http.createServer(this.requestListener.bind(this)).listen(port, hostname, () => {
      if(typeof callback === "undefined") {
        console.log(`Server available on http://${hostname}:${port}\n`)
      } else {
        callback()
      }
    })
  }

}
