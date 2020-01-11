import http from "http"
import { join } from "path"
import { Context } from "./Context"

export type APIHandlers = {
  [path: string]: {
    path: string
    params: string[]
  }
}

export class API {
  private path: string
  private handlers: APIHandlers = {}

  constructor(path: string) {
    this.path = path
  }

  setHandlers(handlers: { [path: string]: string }) {
    this.handlers = Object.keys(handlers).reduce((result, handlerPath) => {
      result[`^${handlerPath.replace(/\{.*?\}/g, "([A-Za-z0-9]+)")}$`] = {
        path: handlers[handlerPath],
        params: handlerPath.match(/\{.*?\}/g)?.map(c => c.slice(1, -1)) || [],
      }
      return result
    }, {} as APIHandlers)
  }

  private getDateString() {
    const now = new Date()
    return now.getFullYear()
    + "/" + ("0" + (now.getMonth() + 1)).slice(-2)
    + "/" + ("0" + now.getDate()).slice(-2)
    + " " + ("0" + now.getHours()).slice(-2)
    + ":" + ("0" + now.getMinutes()).slice(-2)
    + ":" + ("0" + now.getSeconds()).slice(-2)
    + "." + ("0" + now.getMilliseconds()).slice(-2)
  }

  private requestListener(request: http.IncomingMessage, response: http.ServerResponse) {
    const start = Date.now()
    const context = new Context(request)

    const paths = Object.keys(this.handlers)
    for(let i = 0; i < paths.length; i++) {
      const handlerRegex = new RegExp(paths[i]).exec(context.url)
      if(handlerRegex !== null) {
        const handler = this.handlers[paths[i]]
        context.path = handler.path
        context.params = handler.params.reduce((result, key, index) => {
          result[key] = handlerRegex[index + 1]
          return result
        }, {} as any)
        break
      }
    }

    Promise.resolve(new Promise(resolve => {
      if(typeof context.path === "undefined") {
        resolve()
      } else {
        import(join(this.path, context.path))
          .catch(() => {
            console.log(`[${this.getDateString()}]     \\> Handler "${context.path}" not found`)
            resolve()
          })
          .then(handler => {
            if(typeof handler.default === "undefined") {
              console.log(`[${this.getDateString()}]     \\> No default export on handler "${context.path}"`)
              resolve()
            } else {
              const output: Promise<Context> = handler.default(context)
              if(typeof output === "undefined") {
                resolve()
              } else {
                output.then(body => {
                  context.body = body
                  resolve()
                })
              }
            }
          })
      }
    })).finally(() => {
      if(typeof context.body === "undefined") {
        context.code = 404
        context.body = "404 - Not found"
      }
      const isString = typeof context.body === "string"
      response.writeHead(context.code, {
        "Content-Type": isString ? "text/plain" : "application/json",
      })
      response.write(isString ? context.body : JSON.stringify(context.body))
      response.end()
      console.log(`[${this.getDateString()}] URL  : ${request.url}`)
      console.log(`                         Code : ${context.code}`)
      if(typeof context.path !== "undefined") {
        console.log(`                         Path : ${context.path}`)
      }
      console.log(`                         Time : ${Date.now() - start}ms`)
    })
  }

  start(port = 8080, hostname = "0.0.0.0", callback?: () => void) {
    http.createServer(this.requestListener.bind(this)).listen(port, hostname, () => {
      if(typeof callback === "undefined") {
        console.log(`Server available on http://${hostname}:${port}/\n`)
      } else {
        callback()
      }
    })
  }
}
