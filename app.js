/*
 * @Author: 胡晨明
 * @Date: 2021-09-17 21:10:48
 * @LastEditTime: 2022-02-28 16:37:47
 * @LastEditors: 胡晨明
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
const session = require('koa-generic-session')
const redisStore = require('koa-redis')
const path = require('path')
const config = require('./config')


// 加载数据库
require('./config/db')

const users = require('./routes/users')
const feedback = require('./routes/feedback')
const customSettings = require('./routes/customSettings')
const lists = require('./routes/lists')
const tasks = require('./routes/tasks')
const notice = require('./routes/notice')
const shareLists = require('./routes/shareLists')
const chat = require('./routes/chat')
const focuses = require('./routes/focuses')
const habits = require('./routes/habits')
const achievements = require('./routes/achievements')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(path.join(__dirname) + '/assets/avatars'))  // 图片静态服务
app.use(require('koa-static')(path.join(__dirname) + '/assets/userFiles'))  // 文件静态服务

app.use(async (ctx, next) => {
  if (!(ctx.url.includes('api'))) {
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

// session 配置
const { REDIS_CONF } = config
app.keys = ['ANYDO#0302']
app.use(session({
  key: 'anydo.sid', // 浏览器 cookie 的名字
  prefix: 'anydo:sess:',  // redis key 的前缀
  // 配置 cookie
  cookie: {
    path: '/',
    httpOnly: false,
    maxAge: 720 * 60 * 60 * 1000
  },
  // 配置 redis 存储空间
  store: redisStore({
    all: `${REDIS_CONF.host}:${REDIS_CONF.port}`
  })
}))

// routes
app.use(users.routes(), users.allowedMethods())
app.use(feedback.routes(), feedback.allowedMethods())
app.use(customSettings.routes(), customSettings.allowedMethods())
app.use(lists.routes(), lists.allowedMethods())
app.use(tasks.routes(), tasks.allowedMethods())
app.use(notice.routes(), notice.allowedMethods())
app.use(shareLists.routes(), shareLists.allowedMethods())
app.use(chat.routes(), chat.allowedMethods())
app.use(focuses.routes(), focuses.allowedMethods())
app.use(habits.routes(), habits.allowedMethods())
app.use(achievements.routes(), achievements.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
