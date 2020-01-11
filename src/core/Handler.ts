
export interface HandlerContext {
  method: string
  headers: any
  params: any
  body: any
}

export type HandlerAction = (context: HandlerContext) => Promise<any>

export const Handler = (action: HandlerAction) => action
