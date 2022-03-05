/*
 * @Author: 胡晨明
 * @Date: 2022-01-31 15:08:53
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-01-31 15:08:54
 * @Description: 维护用户ID自增长表
 */
const mongoose = require('mongoose')

const CounterSchema = mongoose.Schema({
    _id: String,
    sequence_value: Number
})

module.exports = mongoose.model('counter', CounterSchema)