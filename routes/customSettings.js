/*
 * @Author: 胡晨明
 * @Date: 2021-10-24 17:01:07
 * @LastEditTime: 2022-01-27 21:36:46
 * @LastEditors: 胡晨明
 * @Description: 自定义设置数据接口汇总
 * @FilePath: \Anydo-app-server\routes\customSettings.js
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const CustomSetting = require('../models/customSettingsSchema')

router.prefix('/api/customsettings')

// 获取用户自定义设置数据
router.get('/usercustomsettings', async function (ctx, next) {
    let auth = ctx.request.headers.authorization
    let {
        data
    } = utils.decoded(auth)

    try {
        const res = await CustomSetting.findOne({ userId: data._id }, { _id: false }).select('functions notify timeAndDate taskDefault')
        ctx.body = utils.success(res, '获取用户自定义设置数据成功')
    } catch (error) {
        ctx.body = utils.fail(`${error}`)
    }
})

// 获取用户功能开启列表
router.get('/userfunctions', async function (ctx, next) {
    let auth = ctx.request.headers.authorization
    let {
        data
    } = utils.decoded(auth)

    try {
        const res = await CustomSetting.findOne({ userId: data._id }, { _id: false }).select('functions')
        ctx.body = utils.success(res, '获取用户功能开启列表成功')
    } catch (error) {
        ctx.body = utils.fail(`${error}`)
    }
})

// 获取用户任务设定默认值数据
router.get('/usertaskdefault', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
      data
  } = utils.decoded(auth)

  try {
    const res = await CustomSetting.findOne({ userId: data._id }, { _id: false }).select('timeAndDate taskDefault')
    ctx.body = utils.success(res, '获取用户任务设定默认值成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 用户自定义设置数据提交
router.post('/postcustomsettings', async function (ctx, next) {
    const params = ctx.request.body

    let auth = ctx.request.headers.authorization
    let {
        data
    } = utils.decoded(auth)
    
    console.log(params)
    try {
        const res = await CustomSetting.findOneAndUpdate({ userId: data._id }, params, {new: true})
        ctx.body = utils.success(res, '提交成功')
    } catch (error) {
        ctx.body = utils.fail(`Error:${error}`)
    }
})

module.exports = router