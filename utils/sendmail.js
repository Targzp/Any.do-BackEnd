/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 23:04:07
 * @LastEditTime: 2022-01-16 21:56:06
 * @LastEditors: 胡晨明
 * @Description: 发送邮箱功能模块
 * @FilePath: \Anydo-app-server\utils\sendmail.js
 */
const nodemailer = require('nodemailer')
let transporter = nodemailer.createTransport({
    // node_modules/nodemailer/lib/well-known/services.json  查看相关的配置，如果使用qq邮箱，就查看qq邮箱的相关配置
    service: 'qq', //类型qq邮箱
    secureConnection: true,
    auth: {
        user: '2392859135@qq.com', // 发送方的邮箱
        pass: 'gcgfczpamelldifg' // smtp 的授权码
    }
});
//pass 不是邮箱账户的密码而是stmp的授权码（必须是相应邮箱的stmp授权码）
//邮箱---设置--账户--POP3/SMTP服务---开启---获取stmp授权码

module.exports = {
    transporter,
}
