import http from "http"
import { parse,  } from "url"
import { join } from "path"
import { HandlerAction } from "./Handler"

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
      const regexPath = handlerPath.replace(/\{.*?\}/g, "([A-Za-z0-9]+)")
      // if(regexPath.charAt(regexPath.length - 1) === "/") regexPath += "?"
      result["^" + regexPath + "$"] = {
        path: handlers[handlerPath],
        params: handlerPath.match(/\{.*?\}/g)?.map(c => c.slice(1, -1)) || [],
      }
      return result
    }, {} as APIHandlers)
  }

  private parseBody(request: http.IncomingMessage, body: string) {
    const contentType = request.headers["content-type"]
    if(typeof contentType !== "undefined") {

      // application/json
      if(contentType === "application/json") {
        return JSON.parse(body)
      }

      // multipart/form-data
      const multipart = "multipart/form-data; boundary="
      if(contentType.slice(0, multipart.length) === multipart) {
        const head = contentType.slice(multipart.length)
        const regex = new RegExp(`${head}\\r\\nContent-Disposition: form-data; name=\\"(.*?)\\"\\r\\n\\r\\n(.*?)\\r\\n`, "g")
        let output: any = {}
        let regexExec = null
        while((regexExec = regex.exec(body)) !== null) {
          output[regexExec[1]] = regexExec[2]
        }
        return output
      }

      // application/x-www-form-urlencoded
      if(contentType === "application/x-www-form-urlencoded") {
        return Object.assign({}, parse("?" + body, true).query)
      }

    }
    return body
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

  private handleResponse(request: http.IncomingMessage, response: http.ServerResponse, code: number, output: any) {
    const isString = typeof output === "string"
    response.writeHead(code, {
      "Content-Type": isString ? "text/plain" : "application/json",
    })
    response.write(isString ? output : JSON.stringify(output))
    response.end()
    console.log(`[${this.getDateString()}] ${code} - ${request.url}`)
  }

  private requestListener(request: http.IncomingMessage, response: http.ServerResponse) {
    const url = parse(request.url as string, true)
    let match: any = null

    const paths = Object.keys(this.handlers)
    for(let i = 0; i < paths.length; i++) {
      const handlerRegex = new RegExp(paths[i]).exec(url.pathname || "")
      if(handlerRegex !== null) {
        const handler = this.handlers[paths[i]]
        match = {
          path: handler.path,
          params: handler.params.reduce((result, key, index) => {
            result[key] = handlerRegex[index + 1]
            return result
          }, {} as any)
        }
        break
      }
    }

    if(match === null) {
      this.handleResponse(request, response, 404, "404 Not found")
    } else {
      console.time(match.path)
      import(join(this.path, match.path))
        .then(handler => {
          if(typeof handler.default === "undefined") {
            this.handleResponse(request, response, 404, "404 Not Found")
            console.log(`[${this.getDateString()}]    \\-> No default export on handler "${match.path}"`)
          } else {
            let body = ""
            request.on("data", chunk => {
              body += chunk.toString()
            })
            request.on("error", error => {
              if(error) {
                this.handleResponse(request, response, 500, "500 Request error")
              }
            })
            request.on("end", () => {
              // console.time(match.end)
              this.handleResponse(request, response, 200, {
                method: request.method || "",
                headers: request.headers,
                params: match.params,
                query: Object.assign({}, url.query),
                body: this.parseBody(request, body),
              })
              /*handlerAction({
                method: request.method || "",
                headers: request.headers,
                params: match.params,
                query: Object.assign({}, url.query),
                body: this.parseBody(body),
              }).then((output: any) => {
                response.writeHead(200, { "Content-Type": "application/json" })
                response.write(JSON.stringify(output))
                response.end()
              })*/
            })
          }
        })
        .catch(() => {
          this.handleResponse(request, response, 404, "404 Not Found")
          console.log(`[${this.getDateString()}]    \\-> Handler "${match.path}" not found`)
        })
    }
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
