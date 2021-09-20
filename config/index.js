/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:03:53
 * @LastEditTime: 2021-09-20 16:37:00
 * @LastEditors: Please set LastEditors
 * @Description: 配置文件
 * @FilePath: \Anydo-app-server\config\index.js
 */
module.exports = {
    URL: 'mongodb://admin:18800519878@47.100.237.107:27017/Anydo?authSource=admin',
    SERVER_PORT: process.env.NODE_ENV === 'dev' ? '3000' : '80'
}