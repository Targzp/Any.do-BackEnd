/*
 * @Author: 胡晨明
 * @Date: 2022-02-13 15:07:07
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-02-13 16:44:45
 * @Description: 聊天接口汇总
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const WSOrder = require('../config/wss')
const ShareLists = require('../models/sharelistsSchema')

router.prefix('/api/chat')

router.post('/send', async function (ctx, next) {
  const { listId, userName, chatContent, chatTime } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  const clients = WSOrder.wss.clients
  const clientsSid = WSOrder.clientsSid
  const values = [...clientsSid.values()]
  const keys = [...clientsSid.keys()]

  try {
    let shareRes = null
    const params = {
      listId,
      userId: data._id,
      userName,
      chatContent,
      chatTime
    }
    if (listId > 300000) {
      shareRes = await ShareLists.findOne({ listId }, { _id: false }).select('listId userId listShareIds mainListId')
      params.mainListId = shareRes.mainListId
    } else {
      shareRes = await ShareLists.findOne({ userId: data._id, mainListId: listId }, { _id: false }).select('listId userId listShareIds mainListId')
      params.listId = shareRes.listId
      params.mainListId = shareRes.mainListId
    }

    const listShareIds = shareRes.listShareIds.map(item => {
      return item.toString()
    })

    const chatMembersId = [shareRes.userId.toString(), ...listShareIds]

    for (memberId of chatMembersId) {
      let index = values.indexOf(memberId)

      if (index > -1) {
        let sid = keys[index]
  
        for (let client of clients) {
          if (client.sid === sid) {
            client.send(JSON.stringify({ flag: 'CHATDATA', data: params, msg: '聊天数据' }))
          }
        }
      }
    }
    ctx.body = utils.success({}, '发送成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router
