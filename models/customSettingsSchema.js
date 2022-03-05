/*
 * @Author: 胡晨明
 * @Date: 2021-10-23 17:12:02
 * @LastEditTime: 2021-10-25 20:58:48
 * @LastEditors: Please set LastEditors
 * @Description: 用户自定义设置数据模型
 * @FilePath: \Anydo-app-server\models\customSettingsSchema.js
 */
const mongoose = require('mongoose')

const customSettingsSchema = mongoose.Schema({
    "userId": mongoose.Types.ObjectId,
    "functions": {
        "calender": {
            type: Boolean,
            default: true
        },
        "habit": {
            type: Boolean,
            default: true
        },
        "focus": {
            type: Boolean,
            default: true
        }
    },
    "timeAndDate": {
        "timeFormat": {
            type: String,
            default: "24"
        },
        "firstDayOfWeek": {
            type: String,
            default: "1"
        }
    },
    "notify": {
        "mailNotify": {
          type: Boolean,
          default: false
        },
        "webNotify": {
            type: Boolean,
            default: true
        }
    },
    "taskDefault": {
        "defaultDate": {
            type: String
        },
        "defaultDateMode": {
            type: String,
            default: "date"
        },
        "defaultNotify": {
            type: String,
            default: "0"
        },
        "defaultPriority": {
            type: String
        },
        "defaultList": {
            type: Number
        }
    }
})

module.exports = mongoose.model("customsetting", customSettingsSchema)