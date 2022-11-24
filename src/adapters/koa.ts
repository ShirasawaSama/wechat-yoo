import Yoo from '../index.js'
import type { Context } from 'koa'

export default (callback: ReturnType<Yoo['callback']>) => async (ctx: Context, next: () => Promise<void>) => {
  const ret = await callback(ctx.request.method, ctx.request.query, (ctx.request as any).body)
  if (!ret) return next()
  ctx.status = ret.status
  ctx.body = ret.body
}
