# wechat-yoo [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

一个基于TypeScript的微信公众平台开发框架.

## Installation

```
npm install wechat-yoo
```

## Usage

### Koa

```
npm install koa koa-bodyparser
```

index.ts:

```ts
import Yoo from 'wechat-yoo'
import koaAdapter from 'wechat-yoo/adapters/koa.js'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'

const yoo = new Yoo('Token')
yoo.default(async (reply, data) => {
  reply.text('Welcome to use WeChatYoo!')
  console.log(data)
})

const app = new Koa()

app.use(bodyParser({ enableTypes: ['xml'] })).use(koaAdapter(yoo.callback())).listen(8123)

console.log('Started!')
```

## Options

```ts
new Yoo({
  token: 'Token',
  key: 'EncodingAESKey',
  appid: 'AppId',
  secret: 'AppSecret',
  autoFetchAccessToken: false,
  accessTokenCacheFile: '.yoo-access-token.json'
})
```

## Author

Shirasawa

### License

[MIT](./LICENSE)
