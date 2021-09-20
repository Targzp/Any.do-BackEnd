/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:13:29
 * @LastEditTime: 2021-09-20 21:09:38
 * @LastEditors: Please set LastEditors
 * @Description: 用户数据模型
 * @FilePath: \Anydo-app-server\models\userSchema.js
 */
const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    "userName": String, //用户名称
    "userPwd": String,  //用户密码，md5加密
    "userMail": String,    //用户邮箱
    "createTime": {
        type: Date,
        default: Date.now()
    },  //创建时间
})

module.exports = mongoose.model("user", UserSchema)