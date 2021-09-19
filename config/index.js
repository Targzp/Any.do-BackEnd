/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:03:53
 * @LastEditTime: 2021-09-19 21:03:53
 * @LastEditors: Please set LastEditors
 * @Description: 配置文件
 * @FilePath: \Anydo-app-server\config\index.js
 */
module.exports = {
    URL: 'mongodb://47.100.237.107:27017/Anydo',
    SERVER_PORT: process.env.NODE_ENV === 'dev' ? '3000' : '80'
}