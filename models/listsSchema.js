/*
 * @Author: 胡晨明
 * @Date: 2021-10-26 16:24:23
 * @LastEditTime: 2021-10-31 16:33:35
 * @Description: 清单数据模型
 * @FilePath: \Anydo-app-server\models\listsSchema.js
 */
const mongoose = require('mongoose')

const listsSchema = mongoose.Schema({
    "userId": mongoose.Types.ObjectId,
    "allLists": {
        type: Array,
        default: [
            {
                listId: 100001,
                listName: "个人清单",
                listFlag: "🏠",
                listShare: false,
                listShareIds: [mongoose.Types.ObjectId]
            },
            {
                listId: 100002,
                listName: "购物清单",
                listFlag: "📦",
                listShare: false,
                listShareIds: [mongoose.Types.ObjectId]
            },
            {
                listId: 100003,
                listName: "工作任务",
                listFlag: "👨‍💻",
                listShare: false,
                listShareIds: [mongoose.Types.ObjectId]
            },
            {
                listId: 100004,
                listName: "学习安排",
                listFlag: "📖",
                listShare: false,
                listShareIds: [mongoose.Types.ObjectId]
            }
        ]
    }
})

module.exports = mongoose.model("list", listsSchema)