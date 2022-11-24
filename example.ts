import Yoo from './src/index.js'
import koaAdapter from './src/adapters/koa.js'
import Koa from 'koa'
// @ts-ignore
import bodyParser from 'koa-bodyparser'

const yoo = new Yoo('Token')
yoo.default(async (reply, data) => {
  reply.text('Welcome to use WeChatYoo!')
  console.log(data)
})

const app = new Koa()

app.use(bodyParser({ enableTypes: ['xml'] })).use(koaAdapter(yoo.callback())).listen(8123)

console.log('Started!')
