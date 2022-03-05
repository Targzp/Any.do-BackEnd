/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:03:53
 * @LastEditTime: 2021-10-17 09:53:27
 * @LastEditors: Please set LastEditors
 * @Description: 配置文件
 * @FilePath: \Anydo-app-server\config\index.js
 */
const password = '18800519878'  /* 数据库连接密码 */
module.exports = {
  MONGODB_CONF: {
    URL: `mongodb://admin:${password}@47.100.237.107:27017/Anydo?authSource=admin`,
    SERVER_PORT: process.env.NODE_ENV === 'dev' ? '3000' : '80'
  },
  REDIS_CONF: {
    port: 6379,
    host: '127.0.0.1'
  }
}