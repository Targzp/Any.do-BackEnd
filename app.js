/*
 * @Author: 胡晨明
 * @Date: 2021-09-17 21:10:48
 * @LastEditTime: 2021-10-24 17:18:05
 * @LastEditors: Please set LastEditors
 * @Description: 请求入口文件
 * @FilePath: \Anydo-app-server\app.js
 */
const Koa = require('koa')
const app = new Koa()
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const util = require('./utils/utils')
const koa_jwt = require('koa-jwt')
const path = require('path')

// 加载数据库
require('./config/db')

const users = require('./routes/users')
const feedback = require('./routes/feedback')
const customSettings = require('./routes/customSettings')
const lists = require('./routes/lists')
const tasks = require('./routes/tasks')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(path.join(__dirname) + '/assets/avatars'))

app.use(async (ctx, next) => {
  if (!(ctx.url.includes('api'))){
    ctx.body = 'static file server'
  } else {
    await next()
  }
})

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// token handler
app.use(async (ctx, next) => {
  await next().catch((err) => {
    console.log(err)
    if (err.status == '401') {
      ctx.status = 200
      ctx.body = util.fail('登录时效已过', null ,util.CODE.AUTH_ERROR)
    } else {
      throw err
    }
  })
})

app.use(koa_jwt({
  secret: 'Anydo#32'
}).unless({
  path: [/^\/api\/users\/login/, /^\/api\/users\/register/, /^\/api\/users\/sendcode/]
}))

// routes
app.use(users.routes(), users.allowedMethods())
app.use(feedback.routes(), feedback.allowedMethods())
app.use(customSettings.routes(), customSettings.allowedMethods())
app.use(lists.routes(), lists.allowedMethods())
app.use(tasks.routes(), tasks.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
