/*
 * @Author: 胡晨明
 * @Date: 2021-10-26 16:54:52
 * @LastEditTime: 2022-02-14 16:53:25
 * @LastEditors: 胡晨明
 * @Description: 清单数据接口汇总
 * @FilePath: \Anydo-app-server\routes\lists.js
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const Lists = require('../models/listsSchema')

router.prefix('/api/lists')

//! 获取用户清单列表数据接口
router.get('/userlists', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await Lists.findOne({ userId: data._id }, { _id: false }).select('allLists')
    ctx.body = utils.success(res, '获取用户清单列表数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户查询清单数据接口
router.post('/searchlist', async function (ctx, next) {
  const { listName } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
      data
  } = utils.decoded(auth)

  try {
    const searchRes = []  // 搜索结果集合
    const res = await Lists.findOne({ userId: data._id }, { _id: false }).select('allLists')
    const allLists = res.allLists

    allLists.forEach(item => {
      if (item.listName.includes(listName)) {
        searchRes.push(item)
      }
    })

    ctx.body = utils.success(searchRes, '获取用户清单列表数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户添加清单数据接口
router.post('/addlist', async function (ctx, next) {
  let { listName, listFlag } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
      data
  } = utils.decoded(auth)

  try {
      let listsRes = await Lists.findOne({ userId: data._id }, { _id: false }).select('allLists')
      let listsLength = listsRes.allLists.length
      let listId = 0
      if (listsLength === 0) {  // 如果清单为为空，则重置 listId 为初始 Id 值
        listId = 100001
      } else {
        listId = listsRes.allLists[listsLength - 1].listId + 1
      }
      
      const params = { listId, listName, listFlag }
      await Lists.findOneAndUpdate({ userId: data._id }, { $push: { allLists: params }})
      ctx.body = utils.success(params, '添加清单成功')
  } catch (error) {
      ctx.fail = utils.fail(`${error}`)
  }
})

//! 用户删除清单接口
router.post('/deletelist', async function (ctx, next) {
  let { listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
      data
  } = utils.decoded(auth)

  try {
    const params = { listId }
    await Lists.findOneAndUpdate({ userId: data._id }, { $pull: { allLists: params }})
    ctx.body = utils.success({}, '删除成功')
  } catch (error) {
    ctx.fail = utils.fail(`${error}`)
  }
})

//! 用户清单名称修改接口
router.post('/editlist', async function(ctx, next) {
  let { listId, listName } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
      data
  } = utils.decoded(auth)

  try {
    await Lists.findOneAndUpdate({ $and: [{ userId: data._id }, { 'allLists.listId': listId }] }, {'$set': {
      'allLists.$.listName': listName,
    }})
    ctx.body = utils.success({}, '更改成功')
  } catch (error) {
    ctx.fail = utils.fail(`${error}`)
  }
})

module.exports = router