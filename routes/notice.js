/*
 * @Author: 胡晨明
 * @Date: 2022-01-28 22:47:50
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-02-28 17:26:01
 * @Description: 消息通知接口汇总
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const WSOrder = require('../config/wss')
const Tasks = require('../models/tasksSchema')
const Lists = require('../models/listsSchema')
const Notifications = require('../models/notificationsSchema')
const ShareLists = require('../models/sharelistsSchema')
const Counter = require('../models/counterSchema')

router.prefix('/api/notice')

//! 用户共享清单邀请通知
router.post('/invitenotice', async function (ctx, next) {
  const { userName, listId, inviteMembers } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  const clients = WSOrder.wss.clients
  const clientsSid = WSOrder.clientsSid
  const values = [...clientsSid.values()]
  const keys = [...clientsSid.keys()]
  const noticeTime = (new Date()).valueOf()
  let listName = ''

  try {
    const res = await Lists.findOne({ userId: data._id }, { _id: false }).select('allLists')
    res.allLists.forEach(list => {
      if (list.listId === listId) {
        listName = list.listName
      }
    })
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }

  const ids = []
  inviteMembers.forEach(item => {
    ids.push(item._id)
  })

  for (let id of ids) {
    let index = values.indexOf(id)

    if (index > -1) {
      let sid = keys[index]

      for (let client of clients) {
        if (client.sid === sid) {
          const params = { noticeFlag: 'SHARELIST', userName, userId: data._id, listId, listName, noticeTime }
          client.send(JSON.stringify({ flag: 'SHARELIST', data: params, msg: '清单邀请通知' }))
        }
      }
    }

    try {
      const noticeData = { noticeFlag: 'SHARELIST', userName, userId: data._id, listId, listName, noticeTime }
      const result = await Notifications.findOne({ userId: id }, { _id: false })
      
      if (!result) {
        const params = { userId: id, notifications: [ noticeData ] }
        await Notifications.create(params)
      } else {
        await Notifications.findOneAndUpdate({ userId: id }, { $push: { notifications: noticeData }})
      }
    } catch (error) {
      ctx.body = utils.fail(`${error}`)
    }
  }

  ctx.body = utils.success({}, '发送成功')
})

//! 用户共享清单拒绝邀请通知
router.post('/rejectinvitenotice', async function (ctx, next) {
  //* userName: 通知发起用户  userId: 通知目标用户 ID 
  const { userName, userId, listName, noticeFlag, noticeTime } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  const clients = WSOrder.wss.clients
  const clientsSid = WSOrder.clientsSid
  const values = [...clientsSid.values()]
  const keys = [...clientsSid.keys()]
  const noticeTimecur = (new Date()).valueOf()

  let index = values.indexOf(userId)
  if (index > -1) {
    let sid = keys[index]

    for (let client of clients) {
      if (client.sid === sid) {
        const params = { noticeFlag: 'REJECTSHARELIST', userName, userId: data._id, listName, noticeTime: noticeTimecur }
        client.send(JSON.stringify({ flag: 'REJECTSHARELIST', data: params, msg: '拒绝清单邀请通知' }))
      }
    }
  }

  try {
    const delData = { noticeFlag, noticeTime }
    const noticeData = { noticeFlag: 'REJECTSHARELIST', userName, userId: data._id, listName, noticeTime: noticeTimecur }
    
    await Notifications.findOneAndUpdate({ userId: data._id }, { $pull: { notifications: delData } })

    const result = await Notifications.findOne({ userId }, { _id: false })
    
    if (!result) {
      const params = { userId, notifications: [ noticeData ] }
      await Notifications.create(params)
    } else {
      await Notifications.findOneAndUpdate({ userId }, { $push: { notifications: noticeData }})
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }

  ctx.body = utils.success({}, '发送成功')
})

//! 用户共享接受邀请通知接口
router.post('/agreeinvitenotice', async function (ctx, next) {
  const { userName, shareUserName, userId, listId, listName, noticeFlag, noticeTime } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  const clients = WSOrder.wss.clients
  const clientsSid = WSOrder.clientsSid
  const values = [...clientsSid.values()]
  const keys = [...clientsSid.keys()]
  const noticeTimecur = (new Date()).valueOf()

  try {
    //* 将邀请方（即所有者）清单 listShare 字段设置为 true（即该清单已设置为共享状态）
    await Lists.findOneAndUpdate({ $and: [{ userId }, { 'allLists.listId': listId }] }, {'$set': {
      'allLists.$.listShare': true
    }})

    //* 查找对应共享清单
    const shareRes = await ShareLists.findOne({ userId, mainListId: listId }, { _id: false })

    if (!shareRes) {
      // 自增 ID
      const doc = await Counter.findOneAndUpdate({
        _id: 'shareListId'
      }, {
        $inc: {
          sequence_value: 1
        }
      }, {
        new: true
      })

      // 获取邀请方清单列表
      const listsRes = await Lists.findOne({ userId }, { _id: false }).select('allLists')
      let listFlag = ''
      listsRes.allLists.forEach(item => {
        if (item.listId === listId) {
          listFlag = item.listFlag
        }
      })

      // 获取邀请方清单所属任务列表
      const tasksRes = await Tasks.findOne({ userId }, { _id: false }).select('allTasks')
      let listTasks = null
      if (tasksRes) {
        tasksRes.allTasks.forEach(item => {
          if (item.listId === listId) {
            listTasks = item.listTasks
          }
        })
        if (!listTasks) {
          listTasks = []
        }
      } else {
        listTasks = []
      }

      const params = {
        userId,
        mainListId: listId,
        listId: doc.sequence_value, //* 共享清单 ID 值
        listName: `${listName}(来自${shareUserName})`,
        listFlag,
        listShareIds: [ data._id ],
        listTasks
      }
      await ShareLists.create(params)
    } else {
      await ShareLists.findOneAndUpdate({ userId, mainListId: listId }, { $push: { listShareIds: data._id }})
    }

    //* 发送接受通知
    let index = values.indexOf(userId)
    if (index > -1) {
      let sid = keys[index]

      for (let client of clients) {
        if (client.sid === sid) {
          const params = { noticeFlag: 'AGREESHARELIST', userName, userId: data._id, listName, noticeTime: noticeTimecur }
          client.send(JSON.stringify({ flag: 'AGREESHARELIST', data: params, msg: '接受清单邀请通知' }))
        }
      }
    }

    const delData = { noticeFlag, noticeTime }
    const noticeData = { noticeFlag: 'AGREESHARELIST', userName, userId: data._id, listName, noticeTime: noticeTimecur }
    
    await Notifications.findOneAndUpdate({ userId: data._id }, { $pull: { notifications: delData } })

    const result = await Notifications.findOne({ userId }, { _id: false })
    
    if (!result) {
      const params = { userId, notifications: [ noticeData ] }
      await Notifications.create(params)
    } else {
      await Notifications.findOneAndUpdate({ userId }, { $push: { notifications: noticeData }})
    }

    const shareResAf = await ShareLists.findOne({ userId, mainListId: listId }, {_id: false}).select('userId mainListId listId listName listFlag listShareIds')

    ctx.body = utils.success(shareResAf, '发送成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户删除共享清单成员通知接口
router.post('/removenotice', async function (ctx, next) {
  const { userName, userId, listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  const clients = WSOrder.wss.clients
  const clientsSid = WSOrder.clientsSid
  const values = [...clientsSid.values()]
  const keys = [...clientsSid.keys()]
  const noticeTimecur = (new Date()).valueOf()
  let listName = ''
  let shareListid = ''


  // 获取共享清单名称和 ID
  const res = await ShareLists.findOne({ userId: data._id, mainListId: listId }, { _id: false }).select('listName listId')
  listName = res.listName
  shareListid = res.listId

  let index = values.indexOf(userId)
  if (index > -1) {
    let sid = keys[index]

    for (let client of clients) {
      if (client.sid === sid) {
        const params = { noticeFlag: 'REMOVEMEMBER', userName, userId: data._id, listName, listId: shareListid, noticeTime: noticeTimecur }
        client.send(JSON.stringify({ flag: 'REMOVEMEMBER', data: params, msg: '移除共享清单成员通知' }))
      }
    }
  }

  try {
    const noticeData = { noticeFlag: 'REMOVEMEMBER', userName, userId: data._id, listName, listId: shareListid, noiceTime: noticeTimecur }
  
    const result = await Notifications.findOne({ userId }, { _id: false })
    
    if (!result) {
      const params = { userId, notifications: [ noticeData ] }
      await Notifications.create(params)
    } else {
      await Notifications.findOneAndUpdate({ userId }, { $push: { notifications: noticeData }})
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }

  ctx.body = utils.success({}, '发送成功')
})

//! 用户共享清单添加/修改/删除后任务通知接口
router.post('/tasknotice', async function (ctx, next) {
  const { flag, userName, listId, taskInfo, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  const flagDics = {
    add: 'ADDTASK',
    edit: 'EDITTASK',
    done: 'DONETASK',
    file: 'ADDFILE',
    delfile: 'DELETEFILE',
    delete: 'DELETETASK',
    assign: 'ASSIGNTASK',
    rassign: 'REMOVEASSIGNTASK'
  }

  const clients = WSOrder.wss.clients
  const clientsSid = WSOrder.clientsSid
  const values = [...clientsSid.values()]
  const keys = [...clientsSid.keys()]
  const noticeTimecur = (new Date()).valueOf()
  let res = null
  let listName = ''
  let mainListId = 0
  let listShareIds = null

  // 获取共享清单名称和成员列表
  if (listId > 300000) {
    res = await ShareLists.findOne({ listId }, { _id: false }).select('userId listId mainListId listName listShareIds') 
  } else {
    res = await ShareLists.findOne({ userId: data._id, mainListId: listId }, { _id: false }).select('userId listId mainListId listName listShareIds')
  }
  if (res) {
    listName = res.listName
    listShareIds = res.listShareIds
    mainListId = res.mainListId
    listShareIds.push(res.userId)

    for (let id of listShareIds) {
      id = id.toString()
      if (id === data._id) {
        continue
      }
      
      let index = values.indexOf(id)
  
      if (index > -1) {
        let sid = keys[index]
  
        for (let client of clients) {
          if (client.sid === sid) {
            const params = { noticeFlag: flagDics[flag], userName, userId: data._id, listId: res.listId, mainListId, listName, taskInfo, taskId, noticeTime: noticeTimecur }
            client.send(JSON.stringify({ flag: flagDics[flag], data: params, msg: '清单任务修改通知' }))
          }
        }
      }
  
      try {
        const noticeData = { noticeFlag: flagDics[flag], userName, userId: data._id, listId: res.listId, mainListId, listName, taskInfo, taskId, noticeTime: noticeTimecur }
        const result = await Notifications.findOne({ userId: id }, { _id: false })
        
        if (!result) {
          const params = { userId: id, notifications: [ noticeData ] }
          await Notifications.create(params)
        } else {
          await Notifications.findOneAndUpdate({ userId: id }, { $push: { notifications: noticeData }})
        }
      } catch (error) {
        ctx.body = utils.fail(`${error}`)
      }
    }

    ctx.body = utils.success({}, '发送成功')
  } else {
    ctx.body = utils.success({}, '无需发送')
  }
})

//! 获取用户通知数据接口
router.get('/notifications', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await Notifications.findOne({ userId: data._id }, { _id: false }).select('notifications')
    if (res) {
      ctx.body = utils.success(res, '获取用户通知数据成功')
    } else {
      ctx.body = utils.success({}, '暂无通知')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 删除用户通知数据接口
router.post('/deletenotification', async function (ctx, next) {
  const { noticeFlag, noticeTime } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const params = { noticeFlag, noticeTime }
    await Notifications.findOneAndUpdate({ userId: data._id }, { $pull: { notifications: params } })
    ctx.body = utils.success({}, '删除成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router
