/*
 * @Author: 胡晨明
 * @Date: 2021-09-17 21:10:48
 * @LastEditTime: 2021-09-19 23:01:41
 * @LastEditors: Please set LastEditors
 * @Description: 用户登录、注册、验证码发送接口
 * @FilePath: \Anydo-app-server\routes\users.js
 */
// c1d52bfc75144dafa738150b74dc9c13
const router = require('koa-router')()

router.prefix('/api/users')

// 注册接口
router.post('/register', function (ctx, next) {

})

// 登录接口
router.post('/login', function (ctx, next) {
})

// 验证码发送接口
router.post('/sendCode', function (ctx, next) {
  const { userPhone } = ctx.request.body
})

module.exports = router
