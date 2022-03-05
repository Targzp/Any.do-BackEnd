/*
 * @Author: 胡晨明
 * @Date: 2022-01-31 14:47:36
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-01-31 23:55:22
 * @Description: 共享清单数据模型
 */
const mongoose = require('mongoose')

const sharelistsSchema = mongoose.Schema({
  "userId": mongoose.Types.ObjectId,
  "mainListId": Number,
  "listId": Number,
  "listName": String,
  "listFlag": String,
  "listShareIds": [mongoose.Types.ObjectId],
  "listTasks": {
    type: Array,
    default: []
  }
})

module.exports = mongoose.model("sharelist", sharelistsSchema)
