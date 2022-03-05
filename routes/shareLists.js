/*
 * @Author: 胡晨明
 * @Date: 2022-02-01 12:21:14
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-02-28 14:03:36
 * @Description: 共享清单（及任务）管理接口汇总
 */
const router = require('koa-router')()
const _ = require('lodash')
const utils = require('../utils/utils')
const ShareLists = require('../models/sharelistsSchema')
const User = require('../models/userSchema')
const Lists = require('../models/listsSchema')

router.prefix('/api/sharelist')

//! 获取共享清单清单数据
router.get('/listdata', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await ShareLists.find({ listShareIds: { $elemMatch: { $eq: data._id } } }, { _id: false }).select('userId mainListId listId listName listFlag listShareIds')
    if (res && res.length > 0) {
      ctx.body = utils.success(res, '获取共享清单列表成功')
    } else {
      ctx.body = utils.success([], '无共享清单列表数据')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 获取共享清单任务列表
router.post('/sharetasks', async function (ctx, next) {
  const { listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await ShareLists.findOne({ listId }, { _id: false })

    if (res.listTasks && res.listTasks.length > 0) {
      const listTasks = res.listTasks.filter(item => {
        return !item.doneFlag && !item.softDelFlag && (item.taskExecutor === data._id || item.memberCreate)
      })

      listTasks.forEach((item, index) => {
        listTasks[index] = { id: new Date().valueOf() + item.taskId, listId, taskId: item.taskId, task: item }
      })

      ctx.body = utils.success(listTasks, '获取成功')
    } else {
      ctx.body = utils.success([], '未创建或任务列表为空')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 获取共享清单人员列表
router.post('/shareusers', async function (ctx, next) {
  const { listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    // const clientsSid = WSOrder.clientsSid
    // const values = [...clientsSid.values()]
    
    let res = null

    if (listId > 300000) {
      res = await ShareLists.findOne({ listId }, { _id: false })
    } else {
      res = await ShareLists.findOne({ userId: data._id, mainListId: listId })
    }

    if (res && res.listShareIds.length > 0) {
      const listShareIds = [...res.listShareIds, res.userId]

      const usersRes = await User.find({ _id: { $in: listShareIds } }).select('userName userMail')

      //? 共享清单用户在线情况（暂时不做）
      // usersRes.forEach(item => {
      //   if (values.includes((item._id).toString())) {
      //     item._doc.online = true
      //   } else {
      //     item._doc.online = false
      //   }
      // })

      ctx.body = utils.success(usersRes, '获取共享清单人员列表成功')
    } else {
      ctx.body = utils.success([], '未查询到对应共享清单或人员为空')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 获取共享清单任务任务动态列表
router.post('/sharetaskdevelopment', async function (ctx, next) {
  const { listId, taskId } = ctx.request.body

  try {
    const res = await ShareLists.findOne({ listId }, { _id: false }).select('listTasks')

    let taskOptRecords = []

    res.listTasks.forEach(item => {
      if (item.taskId === taskId) {
        if (item.taskOptRecords && item.taskOptRecords.length > 0) {
          taskOptRecords = item.taskOptRecords
        }
      }
    })

    ctx.body = utils.success(taskOptRecords, '获取任务动态成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 获取当前共享清单任务指派者ID接口
router.post('/getassignid', async function (ctx, next) {
  const { listId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let userId = ''
    const res = await ShareLists.findOne({ userId: data._id, mainListId: listId}).select('listTasks')
    if (res && res.listTasks && res.listTasks.length > 0) {
      res.listTasks.forEach(item => {
        if (item.taskId === taskId) {
          userId = item.taskExecutor
        }
      })
    }

    if (userId) {
      ctx.body = utils.success({ userId }, '获取指派成员id成功')
    } else {
      ctx.body = utils.success({}, '获取指派成员id失败')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 共享清单任务指派接口
router.post('/assignmember', async function (ctx, next) {
  const { userId, listId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await ShareLists.findOneAndUpdate({ $and: [{ userId: data._id }, { mainListId: listId }, { 'listTasks.taskId': taskId }] }, {'$set': {
      'listTasks.$.taskExecutor': userId,
    }})

    ctx.body = utils.success(res, '任务指派成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 共享清单任务移除指派接口
router.post('/removeassignmember', async function (ctx, next) {
  const { listId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    await ShareLists.findOneAndUpdate({ $and: [{ userId: data._id }, { mainListId: listId }, { 'listTasks.taskId': taskId }] }, {'$set': {
      'listTasks.$.taskExecutor': null,
    }})

    ctx.body = utils.success({}, '任务取消指派成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 移除共享清单成员接口
router.post('/removemember', async function (ctx, next) {
  const { userId, listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await ShareLists.findOneAndUpdate({ userId: data._id, mainListId: listId }, { $pull: { listShareIds: userId }}, { new: true })
    
    if (res.listShareIds.length === 0) {
      //* 将邀请方（即所有者）清单 listShare 字段设置为 false（即该清单设置为未共享状态）
      await Lists.findOneAndUpdate({ $and: [{ userId: data._id }, { 'allLists.listId': listId }] }, {'$set': {
        'allLists.$.listShare': false
      }})
    }

    ctx.body = utils.success({}, '成员移除成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router