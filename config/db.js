/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 20:58:23
 * @LastEditTime: 2022-01-19 23:38:13
 * @LastEditors: 胡晨明
 * @Description: 数据库连接
 * @FilePath: \Anydo-app-server\config\db.js
 */
const mongoose = require('mongoose')
const config = require('./index')
mongoose.connect(config.MONGODB_CONF.URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

const db = mongoose.connection

db.on('error', err => {
    console.log(err)
})

db.on('open', () => {
    console.log("**Any.do数据库连接成功**")
})