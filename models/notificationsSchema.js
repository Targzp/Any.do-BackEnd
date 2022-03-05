/*
 * @Author: 胡晨明
 * @Date: 2022-01-29 22:07:15
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-01-29 22:07:16
 * @Description: 通知消息数据模型
 */
const mongoose = require('mongoose')

const notificationsSchema = mongoose.Schema({
  "userId": mongoose.Types.ObjectId,
  "notifications": {
    type: Array
  }
})

module.exports = mongoose.model("notification", notificationsSchema)