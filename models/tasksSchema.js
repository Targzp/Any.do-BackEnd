/*
 * @Author: 胡晨明
 * @Date: 2021-12-01 16:17:42
 * @LastEditTime: 2021-12-01 16:17:43
 * @LastEditors: Please set LastEditors
 * @Description: 任务数据模型
 * @FilePath: \Anydo-app-server\models\tasksSchema.js
 */
const mongoose = require('mongoose')

const tasksSchema = mongoose.Schema({
  "userId": mongoose.Types.ObjectId,
  "allTasks": {
    type: Array,
    default: []
  }
})

module.exports = mongoose.model("task", tasksSchema)
