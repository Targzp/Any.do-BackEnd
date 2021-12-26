/*
 * @Author: 胡晨明
 * @Date: 2021-10-16 19:53:15
 * @LastEditTime: 2021-10-18 22:55:53
 * @LastEditors: Please set LastEditors
 * @Description: 用户反馈接口
 * @FilePath: \Anydo-app-server\routes\feedback.js
 */
const path = require('path')
const router = require('koa-router')()
const utils = require('../utils/utils')
const { writeExcel } = require('../utils/writeExcel')
const User = require('../models/userSchema')

router.prefix('/api')

router.post('/feedback', async function (ctx, next) {
    const { advice } = ctx.request.body

    let auth = ctx.request.headers.authorization
    let {
        data
    } = utils.decoded(auth)

    try {
        const res = await User.findById({ _id: data._id }, 'userName userMail')     // 获取用户名和用户邮箱
        // 测试数据：const res2 = await User.findByIdAndUpdate({ _id: data._id }, { 'test.testData2': '222' })
        // 生成反馈数据
        let feedback = [
            {
                用户名: res.userName,
                用户邮箱: res.userMail,
                用户建议: advice,
                时间: utils.formateDate(new Date())
            }
        ]

        // excel表路径
        const filePath = path.resolve(__dirname, '../assets/feedbackFiles/feedbacks.xlsx')
        // 反馈数据写入
        writeExcel(filePath, feedback)

        ctx.body = utils.success({}, '提交成功')
    } catch (error) {
        ctx.body = utils.fail(`${error}`)
    }
})

module.exports = router