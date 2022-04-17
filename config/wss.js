/*
 * @Author: 胡晨明
 * @Date: 2022-01-19 13:40:43
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-03-06 21:12:38
 * @Description: ws 模块
 */
const utils = require('../utils/utils')

module.exports = {
  numClients: 0,  // 连接计数器
  clientsSid: new Map(),
  createWss: function (wss) {
    wss.on('connection', function (ws, req) {
      this.numClients++

      ws.isAlive = true
      ws.sid = req.headers.cookie && req.headers.cookie.split('; ')[0].split('=')[1]

      // ws.on('pong', this.heartbeat) // 测试激活连接

      ws.on('error', this.handleError.bind(this))
      
      this.handleConnect(wss)  // 连接第一次广播

      ws.on('message', this.handleMessage.bind(this))

      ws.on('close', function () {  // 监听连接优雅断开
        this.numClients--

        const sidArr = []
        for (let client of this.wss.clients) {
          sidArr.push(client.sid)
        }

        for (let key of this.clientsSid.keys()) {
          if (!sidArr.includes(key)) {
            this.clientsSid.delete(key)
          }
        }

        console.log('clientsSid', this.clientsSid)
      }.bind(this))
    }.bind(this))

    // 将第一次创建连接时传入的 wss 保存起来，以便在其他路由中使用时可以直接传入
    // 因为 handle 函数必须传入 wss，而普通路由中没有这个 wss，只有 www.js 文件中有
    this.wss = wss
  },
  handleError () {
    console.log('WebSocket Error')
  },
  handleConnect (wss) {
    // 在此可以写业务逻辑，如查询数据库设置返回内容
    console.log('webSocket connectClients:', this.numClients)
    wss.clients.forEach(client => {

      if (client.isAlive === false) {
        this.numClients--
        return client.terminate()
      }

      // client.isAlive = false
      client.ping(this.noop)
      client.send(JSON.stringify({ flag: 'CONNECT', msg: '连接成功' }))
    })
  },
  handleMessage (msg) {
    msg = JSON.parse(msg)

    console.log('msg', msg) //? 查看客户端连接数据
    if (msg.flag === 'connect') {

      try {
        let auth = 'Bearer ' + msg.token
        let {
          data
        } = utils.decoded(auth)
        this.clientsSid.set(msg.sid, data._id)

        console.log('clientsSid', this.clientsSid)
      } catch (error) {
        console.log(error)
      }
    }
  },
  heartbeat () {
    this.isAlive = true
  },
  noop () {}
}
