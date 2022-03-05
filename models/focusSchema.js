/*
 * @Author: 胡晨明
 * @Date: 2022-02-17 14:09:28
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-02-17 14:09:29
 * @Description: 专注数据模型
 */
const mongoose = require('mongoose')

const focusesSchema = mongoose.Schema({
  "userId": mongoose.Types.ObjectId,
  "focuses": {
    type: Array,
    default: []
  }
})

module.exports = mongoose.model("focuses", focusesSchema)
