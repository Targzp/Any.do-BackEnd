/*
 * @Author: 胡晨明
 * @Date: 2021-09-20 15:13:44
 * @LastEditTime: 2021-09-20 21:25:16
 * @LastEditors: Please set LastEditors
 * @Description: 验证码数据模型
 * @FilePath: \Anydo-app-server\models\codeSchema.js
 */
const mongoose = require('mongoose')

const CodeSchema = mongoose.Schema({
    "userMail": String,    //用户邮箱
    "userCode": String,     //用户验证码
    "exceedTime": Date
})

module.exports = mongoose.model("code", CodeSchema)