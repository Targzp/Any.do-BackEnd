/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:13:29
 * @LastEditTime: 2021-09-19 21:16:52
 * @LastEditors: Please set LastEditors
 * @Description: 用户数据模型
 * @FilePath: \Anydo-app-server\models\userSchema.js
 */
const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    "userId": Number,   //用户ID，自增长
    "userName": String, //用户名称
    "userPwd": String,  //用户密码，md5加密
    "userPhone": Number,    //手机号
    "userEmail": String,    //用户邮箱
    "createTime": {
        type: Date,
        default: Date.now()
    },  //创建时间
})

module.exports = mongoose.model("user", UserSchema)