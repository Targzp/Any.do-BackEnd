/*
 * @Author: 胡晨明
 * @Date: 2022-02-28 15:34:06
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-02-28 15:34:06
 * @Description: 用户成就值数据模型
 */
const mongoose = require('mongoose')

const achievementsSchema = mongoose.Schema({
  "userId": mongoose.Types.ObjectId,
  "achievementScores": {
    type: Number,
    default: 0
  },
  "scoreByDay": {
    type: Object,
    default: {}
  }
})

module.exports = mongoose.model("achievement", achievementsSchema)