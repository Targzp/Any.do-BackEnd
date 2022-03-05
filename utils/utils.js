/*
 * @Author: 胡晨明
 * @Date: 2021-09-19 21:22:33
 * @LastEditTime: 2021-10-17 17:04:14
 * @LastEditors: Please set LastEditors
 * @Description: 项目所用工具函数
 * @FilePath: \Anydo-app-server\utils\utils.js
 */
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const CODE = {
  SUCCESS: 200,
  PARAM_ERROR: 10001, // 参数错误
  USER_ACCOUNT_ERROR: 20001, // 账号或密码错误
  USER_LOGIN_ERROR: 30001, // 用户未登录
  BUSINESS_ERROR: 40001, // 业务请求失败
  AUTH_ERROR: 50001, // 认证失败或TOKEN过期
}

module.exports = {
  /**
   * @description: 分页结构封装
   * @param {number} pageNum
   * @param {number} pageSize
   */
  pager({
    pageNum = 1,
    pageSize = 10
  }) {
    pageNum *= 1  // 转换为number类型
    pageSize *= 1
    const skipIndex = (pageNum - 1) * pageSize
    return {
      page: {
        pageNum,
        pageSize
      },
      skipIndex
    }
  },
  /**
   * @description: 成功结构体封装
   * @param {*} data
   * @param {string} msg
   * @param {number} code
   */
  success(data = '', msg = '', code = CODE.SUCCESS) {
    return {
      code,
      data,
      msg
    }
  },
  /**
   * @description: 失败结构体封装
   * @param {string} msg
   * @param {number} code
   */
  fail(msg = '', data = '', code = CODE.BUSINESS_ERROR) {
    return {
      code,
      data,
      msg
    }
  },
  /**
   * @description: 解密 token 数据
   * @param {String} auth
   */
  decoded(auth) {
    if (auth) {
      let token = auth.split(' ')[1]
      return jwt.verify(token, 'Anydo#32')
    }
    return ''
  },
  /**
   * @description: 时间格式化
   * @param {*} date
   * @param {*} rule
   */
  formateDate(date, rule) {
    let fmt = rule || 'yyyy-MM-dd hh:mm:ss'
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, date.getFullYear())
    }
    const o = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'h+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds()
    }
    for (let key in o) {
      if (new RegExp(`(${key})`).test(fmt)) {
        const val = o[key] + ''
        fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? val : ('00' + val).substr(val.length))
      }
    }
    return fmt
  },
  /**
   * @description: 删除文件工具函数
   * @param {*} fileName
   * @param {*} flag
   */  
  deleteFile(fileName, flag) {
    let filePath = ''

    if (flag === 'avatar') {
      filePath = path.resolve(__dirname, `../assets/avatars/${fileName}`)
    } else if (flag === 'taskFile') {
      /* TODO: 任务文件的删除处理 */
      filePath = path.resolve(__dirname, `../assets/userFiles/${fileName}`)
    }

    try {
      let res = fs.unlinkSync(filePath)
      return !res
    } catch (error) {
      return false
    }
  },
  CODE
}