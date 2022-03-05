/*
 * @Author: 胡晨明
 * @Date: 2022-02-23 15:54:49
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-02-23 17:54:43
 * @Description: 习惯打卡数据模型
 */
const mongoose = require('mongoose')

const habitsSchema = mongoose.Schema({
  "userId": mongoose.Types.ObjectId,
  "habits": {
    type: Array,
    default: []
  }
})

module.exports = mongoose.model("habit", habitsSchema)
