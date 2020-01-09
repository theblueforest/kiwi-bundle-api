import http from "http"

export interface HandlerParams {
  method: string
}

export type HandlerAction = (params: HandlerParams) => Promise<any>

export const Handler = (action: HandlerAction) => action
