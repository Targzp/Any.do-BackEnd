/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:13:29
 * @LastEditTime: 2021-10-18 22:43:04
 * @LastEditors: Please set LastEditors
 * @Description: 用户数据模型
 * @FilePath: \Anydo-app-server\models\userSchema.js
 */
const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    "userName": String, //用户名称
    "userPwd": String,  //用户密码，md5加密
    "userMail": String,    //用户邮箱
    "userAvatar": String,   //用户头像标识
    "userSex": String,      //用户性别
    "userBirthday": Date,   //用户生日
    "useDays": Number,      //用户使用天数
    "lastLoginTime": Number, //用户上次登录时间 
    "createTime": {
        type: Date,
        default: Date.now()
    },  //创建时间
})

module.exports = mongoose.model("user", UserSchema)