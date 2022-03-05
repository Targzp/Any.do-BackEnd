/*
 * @Author: 胡晨明
 * @Date: 2021-12-01 16:44:41
 * @LastEditTime: 2022-03-02 16:15:53
 * @LastEditors: 胡晨明
 * @Description: 任务数据接口汇总
 * @FilePath: \Anydo-app-server\routes\tasks.js
 */
const fs = require('fs')
const path = require('path')
const router = require('koa-router')()
const utils = require('../utils/utils')
const User = require('../models/userSchema')
const Tasks = require('../models/tasksSchema')
const CustomSetting = require('../models/customSettingsSchema')
const ShareLists = require('../models/sharelistsSchema')
const Achievements = require('../models/achievementsSchema')
const { transporter } = require('../utils/sendmail')
const multer = require('@koa/multer')
const _ = require('lodash')
const dayjs = require('dayjs')
const isBetween = require('dayjs/plugin/isBetween')
const weekOfYear = require('dayjs/plugin/weekOfYear')
const isToday = require('dayjs/plugin/isToday')
dayjs.extend(isBetween)
dayjs.extend(weekOfYear)
dayjs.extend(isToday)

router.prefix('/api/tasks')

// 任务附件标识
let fileInfo = {
  fileFlag: '',
  fileName: '',
  fileSize: ''
}

// 文件上传基本配置
let storage = multer.diskStorage({
  // 文件保存路径
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname + '/../assets/userFiles'))
  },
  // 修改文件名称
  filename: function (req, file, cb) {
    const splitFileNameArray = file.originalname.split('.')
    let type = splitFileNameArray[splitFileNameArray.length - 1]

    splitFileNameArray.splice(splitFileNameArray.length - 1)

    fileInfo.fileName = `${splitFileNameArray.join('.')}.${type}`
    fileInfo.fileFlag = `${splitFileNameArray.join('.')}-${Date.now().toString(16)}.${type}`
    cb(null, fileInfo.fileFlag)
  }
})

// 加载配置
let upload = multer({ storage })

// 文件删除中间件
const fileDelete = async (ctx, next) => {
  const beforeFileFlag = decodeURI(ctx.params.beforeFileFlag || ctx.params.fileFlag)

  try {
    if (beforeFileFlag !== 'noFile') {
      utils.deleteFile(beforeFileFlag, 'taskFile')
    }

    await next()
  } catch (error) {
    ctx.body = utils.fail(`Error: ${error}`)
  }
}

//* 任务动态通用逻辑
const addUserTaskDevelopment = async (userId, mainUserId, taskId, listId, optFlag, isEditShare, shareId) => {
  const resUser = await User.findById({ _id: userId }, 'userName')

  const optRecord = {
    optFlag,
    optTime: new Date().valueOf() + '',
    optName: resUser.userName
  }

  const resTask = await Tasks.findOneAndUpdate({ userId: mainUserId }, {
    '$push': {
      'allTasks.$[list].listTasks.$[task].taskOptRecords': optRecord
    }
  }, {
    arrayFilters: [{
      'list.listId': listId
    }, {
      'task.taskId': taskId
    }],
    new: true
  })

  if (isEditShare) {
    await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {
      '$push': {
        'listTasks.$.taskOptRecords': optRecord
      }
    })
  }

  return resTask
}

//* 添加任务通用逻辑
const addUserTask = async (userId, task, listId) => {
  const result = await Tasks.findOne({ userId }, { _id: false }).select('allTasks')

  // 如果用户任务数据为空，则创建
  if (!result) {
    task.taskId = 200001
    const listParams = { listId, listTasks: [ task ] }   // 创建指定清单下任务集合
    const allTaskParams = { userId, allTasks: [ listParams ] }  // 创建用户清单任务集合
    await Tasks.create(allTaskParams)
    return task
  }

  const allTasks = result.allTasks  // 如果用户任务数据不为空，则获取所有清单任务集合
  const list = allTasks.find((item) => item.listId === listId)  // 根据 listId 找到对应清单任务集合

  // 如果清单任务集合为空或者找不到对应清单任务集合，则新创建指定清单下任务集合；否则就在指定清单下任务集合中插入一条任务
  if (list) {
    const listTasks = list.listTasks  // 获取任务集合
    if (listTasks.length > 0) {
      task.taskId = listTasks[listTasks.length - 1].taskId + 1   // 计算新增任务 taskId
    } else {
      task.taskId = 200001 // 重置 taskId
    }
    await Tasks.findOneAndUpdate({ $and: [{ userId }, { 'allTasks.listId': listId }] }, { $push: {
      'allTasks.$.listTasks': task,
    }})
  } else {
    task.taskId = 200001 // 重置 taskId
    const listParams = { listId, listTasks: [ task ] }
    await Tasks.findOneAndUpdate({ userId }, { $push: { allTasks: listParams }})
  }

  return task
}

//* 删除任务通用逻辑
const deleteUserTask = async (userId, listId, taskId) => {
  await Tasks.findOneAndUpdate({ userId }, {
    '$pull': {
      'allTasks.$[list].listTasks': { taskId }
    }
  }, {
    arrayFilters: [{
      'list.listId': listId
    }]
  })

  await ShareLists.findOneAndUpdate({ userId, mainListId: listId }, { $pull: { listTasks: { taskId } } })
}

//! 用户添加任务数据接口
router.post('/addtask', async function (ctx, next) {
  const { task, listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let userId
    let resTask
    let mainListId
    let userRes = null
    if (listId > 300000) {
      userRes = await ShareLists.findOne({ listId }).select('userId mainListId')
      if (userRes) {
        userId = userRes.userId
        mainListId = userRes.mainListId
        resTask = await addUserTask(userId, task, mainListId)
        resTask.memberCreate = true
        await ShareLists.findOneAndUpdate({ listId }, { $push: { listTasks: resTask } })
      } else {
        resTask = await addUserTask(data._id, task, listId)
      }
    } else {
      userRes = await ShareLists.findOne({ userId: data._id, mainListId: listId }).select('userId mainListId')
      if (userRes) {
        userId = userRes.userId
        mainListId = userRes.mainListId
        resTask = await addUserTask(userId, task, mainListId)
        await ShareLists.findOneAndUpdate({ userId: data._id, mainListId: listId }, { $push: { listTasks: resTask } })
      } else {
        resTask = await addUserTask(data._id, task, listId)
      }
    }
    ctx.body = utils.success(resTask, '添加任务成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户获取所有任务列表接口
router.get('/alltasks', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Tasks.findOne({ userId: data._id }, { _id: false }).select('allTasks')
    if (result) {
      ctx.body = utils.success(result, '获取全部任务成功')
    } else {
      ctx.body = utils.success({}, '用户没有任务数据')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户获取指定任务接口
router.post('/gettask', async function (ctx, next) {
  const { listId, mainListId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let task = null
    let tasksRes = null
    const shareIdsRes = await ShareLists.findOne({ listId }, { _id: false }).select('listShareIds')
    const ids = shareIdsRes.listShareIds.map(id => id.toString())
    
    if (ids.includes(data._id)) {
      tasksRes = await ShareLists.findOne({ listId }, { _id: false }).select('listTasks')
      tasksRes.listTasks.forEach(item => {
        if (item.taskId === taskId) {
          task = item
        }
      })
    } else {
      tasksRes = await Tasks.findOne({ userId: data._id }, { _id: false }).select('allTasks')
      tasksRes.allTasks.forEach(item => {
        if (item.listId === mainListId) {
          item.listTasks.forEach(item => {
            if (item.taskId === taskId) {
              task = item
            }
          })
        }
      })
    }
    ctx.body = utils.success(task, '获取同步任务数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户查询任务数据接口
router.post('/searchTask', async function (ctx, next) {
  const { taskInfo, filterDate, filterList, filterStatus, filterPriority, filterAssign } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    // 获取全部任务数据
    const allTasks = []
    const selfTasks = await Tasks.findOne({ userId: data._id }, { _id: false }).select('allTasks')
    console.log('selfTasks: ', selfTasks);
    selfTasks.allTasks.forEach(item => {
      const listId = item.listId
      item.listTasks.forEach(task => {
        task.listId = listId
        allTasks.push(task)
      })
    })
    const shareTasks = await ShareLists.find({ listShareIds: { $elemMatch: { $eq: data._id } } }).select('listId mainListId listTasks')
    shareTasks.forEach(item => {
      const listId = item.listId
      item.listTasks.forEach(task => {
        if (task.taskExecutor === data._id) {
          task.listId = listId
          allTasks.push(task)
        }
      })
    })

    // 在全部任务中根据筛选条件获取对应任务
    const filterTasks = []
    allTasks.forEach(task => {
      // 筛选任务信息
      if (taskInfo) {
        if (!task.taskInfo.includes(taskInfo)) {
          return
        }
      }

      // 筛选任务日期
      if (filterDate) {
        const startTaskDate = task.startTaskDate && +task.startTaskDate
        const taskTime = (task.taskTime && +task.taskTime) || (task.taskDate && +task.taskDate)
        const startTime = startTaskDate || taskTime
        const todayYear = dayjs().year()
        const taskYear = dayjs(startTime).year()
        if (filterDate === 'today') {
          let todayDateStart = dayjs().startOf('day').valueOf()  // 获取今日起始时间戳
          let todayDateEnd = dayjs().endOf('day').valueOf()      // 获取今日结束时间戳

          if (!(dayjs(startTime).isBetween(dayjs(todayDateStart), dayjs(todayDateEnd), null, '[]'))) {
            return
          }
        } else if (filterDate === 'week') {
          const todayWhichWeek = dayjs().week()
          const taskWhichWeek = dayjs(startTime).week()

          if (!(todayYear === taskYear && todayWhichWeek === taskWhichWeek)){
            return
          }
        } else if (filterDate === 'month') {
          const todayMonth = dayjs().month()
          const taskMonth = dayjs().month()

          if (!(todayYear === taskYear && todayMonth === taskMonth)) {
            return
          }
        }
      }

      // 筛选任务所属清单
      if (filterList) {
        if (!(task.listId === filterList)) {
          return
        }
      }

      // 筛选任务状态
      if (filterStatus) {
        if (filterStatus === 'done') {
          if (!task.doneFlag) {
            return
          }
        } else if (filterStatus === 'doing') {
          if (task.doneFlag) {
            return
          }
        }
      }

      // 筛选任务优先级
      if (filterPriority) {
        if (filterPriority === 'high') {
          if (!(task.taskPriority === 'high')) {
            return
          }
        } else if (filterPriority === 'mid') {
          if (!(task.taskPriority === 'mid')) {
            return
          }
        } else if (filterPriority === 'low') {
          if (!(task.taskPriority === 'low')) {
            return
          }
        }
      }

      // 筛选任务指派人
      if (filterAssign) {
        if (filterAssign === 'assignMe') {
          if (!(task.taskExecutor === data._id)) {
            return
          }
        }
      }

      filterTasks.push(task)
    })


    ctx.body = utils.success(filterTasks, '获取任务成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户修改任务相关值接口
router.post('/updatetask', async function (ctx, next) {
  let { listId, taskId, flag, value, extValue } = ctx.request.body
  console.log('listId: ', listId);
  
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let res
    let userId = data._id
    let mainUserId = ''
    let isEditShare = false
    let shareId = ''
    
    if (listId > 300000) {
      const userIdRes = await ShareLists.findOne({ listId }, { _id: false }).select('userId mainListId')
      mainUserId = userIdRes.userId
      userId = userIdRes.userId
      shareId = listId
      listId = userIdRes.mainListId
      isEditShare = true
    } else {
      mainUserId = data._id
      userId = data._id
      const shareRes = await ShareLists.findOne({ userId, mainListId: listId }, { _id: false }).select('listId')
      if (shareRes) {
        isEditShare = true
        shareId = shareRes.listId
      }
    }
    
    // 根据 flag 值对任务特定值进行修改
    // arrayFilters 过滤器可以将符合条件的字段筛选出来，再进行你想要的的操作
    switch (flag) {
      case 'done':
        await Tasks.findOneAndUpdate({ userId },{
          '$set': {
            'allTasks.$[list].listTasks.$[task].doneFlag': value,
            'allTasks.$[list].listTasks.$[task].doneTime': extValue,
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }]
        })

        if (isEditShare) {
          await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
            'listTasks.$.doneFlag': value,
            'listTasks.$.doneTime': extValue
          }})
        }

        res = await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'DONE', isEditShare, shareId)  // 添加任务动态
        
        //* 完成任务增加或减少成就值
        let { achievementScores, scoreByDay } = await Achievements.findOne({ userId: data._id }, { _id: false }).select('achievementScores scoreByDay')
        let scores = 0
        if (!scoreByDay) {
          scoreByDay = {}
        }
        if (value) {
          //* 获取修改任务查看任务日期
          res.allTasks.forEach(async (item) => {
            if (item.listId === listId) {
              item.listTasks.forEach(async (item) => {
                if (item.taskId === taskId) {
                  if (
                    (!item.taskDate && !item.startTaskDate) ||
                    (item.taskDate && dayjs().endOf('day').valueOf() <= (+item.taskDate)) ||
                    (item.startTaskDate && dayjs().isBetween(dayjs(+item.startTaskDate), dayjs(+item.endTaskDate), null, '[]'))
                  ) {
                    scores = achievementScores + 2
                    scoreByDay[dayjs().format('YYYYMMDD')] = scores
                    console.log('scoreByDay: ', scoreByDay)
                    await Achievements.findOneAndUpdate({ userId: data._id }, { 'achievementScores':  scores, 'scoreByDay': scoreByDay })
                  }
                }
              })
            }
          })
        } else {
          scores = (achievementScores - 2 >= 0)?(achievementScores - 2):0
          scoreByDay[dayjs().format('YYYYMMDD')] = scores
          console.log('scoreByDay: ', scoreByDay)
          await Achievements.findOneAndUpdate({ userId: data._id }, { 'achievementScores':  scores, 'scoreByDay': scoreByDay })
        }
        break
      case 'softDel':
        res = await Tasks.findOneAndUpdate({ userId }, {
          '$set': {
            'allTasks.$[list].listTasks.$[task].softDelFlag': value
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }],
          new: true
        })

        if (isEditShare) {
          await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
            'listTasks.$.softDelFlag': value,
          }})
        }

        break
      case 'setList':
        await deleteUserTask(userId, listId, taskId)  // 将任务从原清单中删除
        res = await addUserTask(userId, extValue, value) // 将任务添加进新清单
        res = res.taskId

        await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'LIST')
        break
      case 'setTaskInfo':
        await Tasks.findOneAndUpdate({ userId }, {
          '$set': {
            'allTasks.$[list].listTasks.$[task].taskInfo': value
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }]
        })

        if (isEditShare) {
          await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
            'listTasks.$.taskInfo': value,
          }})
        }

        res = await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'TITLE', isEditShare, shareId)
        break
      case 'setTaskDesc':
        await Tasks.findOneAndUpdate({ userId }, {
          '$set': {
            'allTasks.$[list].listTasks.$[task].taskDesc': value
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }]
        })

        if (isEditShare) {
          await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
            'listTasks.$.taskDesc': value,
          }})
        }

        res = await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'DESC', isEditShare, shareId)
        break
      case 'setTaskPriority':
        await Tasks.findOneAndUpdate({ userId }, {
          '$set': {
            'allTasks.$[list].listTasks.$[task].taskPriority': value
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }],
          new: true
        })

        if (isEditShare) {
          await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
            'listTasks.$.taskPriority': value,
          }})
        }

        res = await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'PRIO', isEditShare, shareId)
        break
      case 'setTaskGeneral':
        if (value.subFlag === 'quantum') {
          await Tasks.findOneAndUpdate({ userId }, {
            '$set': {
              'allTasks.$[list].listTasks.$[task].taskDate': '',
              'allTasks.$[list].listTasks.$[task].taskTime': '',
              'allTasks.$[list].listTasks.$[task].startTaskDate': value.startTaskDate,
              'allTasks.$[list].listTasks.$[task].startTaskTime': value.startTaskTime,
              'allTasks.$[list].listTasks.$[task].endTaskDate': value.endTaskDate,
              'allTasks.$[list].listTasks.$[task].endTaskTime': value.endTaskTime,
              'allTasks.$[list].listTasks.$[task].notify': value.notify,
            }
          }, {
            arrayFilters: [{
              'list.listId': listId
            }, {
              'task.taskId': taskId
            }]
          })
          
          if (isEditShare) {
            await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
              'listTasks.$.taskDate': '',
              'listTasks.$.taskTime': '',
              'listTasks.$.startTaskDate': value.startTaskDate,
              'listTasks.$.startTaskTime': value.startTaskTime,
              'listTasks.$.endTaskDate': value.endTaskDate,
              'listTasks.$.endTaskTime': value.endTaskTime,
              'listTasks.$.notify': value.notify,
            }})
          }
        } else if (value.subFlag === 'date') {
          await Tasks.findOneAndUpdate({ userId }, {
            '$set': {
              'allTasks.$[list].listTasks.$[task].taskDate': value.taskDate,
              'allTasks.$[list].listTasks.$[task].taskTime': value.taskTime,
              'allTasks.$[list].listTasks.$[task].startTaskDate': '',
              'allTasks.$[list].listTasks.$[task].startTaskTime': '',
              'allTasks.$[list].listTasks.$[task].endTaskDate': '',
              'allTasks.$[list].listTasks.$[task].endTaskTime': '',
              'allTasks.$[list].listTasks.$[task].notify': value.notify,
            }
          }, {
            arrayFilters: [{
              'list.listId': listId
            }, {
              'task.taskId': taskId
            }]
          })

          if (isEditShare) {
            await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
              'listTasks.$.taskDate': value.taskDate,
              'listTasks.$.taskTime': value.taskTime,
              'listTasks.$.startTaskDate': '',
              'listTasks.$.startTaskTime': '',
              'listTasks.$.endTaskDate': '',
              'listTasks.$.endTaskTime': '',
              'listTasks.$.notify': value.notify,
            }})
          }
        } else {
          await Tasks.findOneAndUpdate({ userId }, {
            '$set': {
              'allTasks.$[list].listTasks.$[task].startTaskDate': value.startTaskDate,
              'allTasks.$[list].listTasks.$[task].startTaskTime': value.startTaskTime,
              'allTasks.$[list].listTasks.$[task].endTaskDate': value.endTaskDate,
              'allTasks.$[list].listTasks.$[task].endTaskTime': value.endTaskTime,
              'allTasks.$[list].listTasks.$[task].taskDate': value.taskDate,
              'allTasks.$[list].listTasks.$[task].taskTime': value.taskTime,
              'allTasks.$[list].listTasks.$[task].notify': value.notify,
            }
          }, {
            arrayFilters: [{
              'list.listId': listId
            }, {
              'task.taskId': taskId
            }]
          })
        }

        if (isEditShare) {
          await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
            'listTasks.$.startTaskDate': value.startTaskDate,
            'listTasks.$.startTaskTime': value.startTaskTime,
            'listTasks.$.endTaskDate': value.endTaskDate,
            'listTasks.$.endTaskTime': value.endTaskTime,
            'listTasks.$.taskDate': value.taskDate,
            'listTasks.$.taskTime': value.taskTime,
            'listTasks.$.notify': value.notify,
          }})
        }

        res = await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'DT', isEditShare, shareId)
        break
      default:
        break
    }
    ctx.body = utils.success(res, '任务值修改成功')
  } catch (error) {
    ctx.fail = utils.fail(`${error}`)
  }
})

//! 用户获取清单任务动态列表接口
router.post('/gettaskdevelopment', async function (ctx, next) {
  const { listId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let taskOptRecords = []
    let listTasks = []
    const res = await Tasks.findOne({ userId: data._id }, { _id: false }).select('allTasks')
    console.log('res: ', res);
    res.allTasks.forEach(item => {
      if (item.listId === listId) {
        listTasks = item.listTasks
      }
    })
    listTasks.forEach(item => {
      if (item.taskId === taskId) {
        if (item.taskOptRecords && item.taskOptRecords.length > 0) {
          taskOptRecords = item.taskOptRecords
        }
      }
    })
    ctx.body = utils.success(taskOptRecords, '获取清单任务动态列表成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户删除任务接口
router.post('/deletetask', async function (ctx, next) {
  const { listId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    await deleteUserTask(data._id, listId, taskId)
    ctx.body = utils.success({}, '任务删除成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户批量删除任务接口
router.post('/batchdeletetask', async function (ctx, next) {
  const { ltIds } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    for (let ltId of ltIds) {
      await Tasks.findOneAndUpdate({ userId: data._id }, {
        '$pull': {
          'allTasks.$[list].listTasks': { taskId: ltId.taskId }
        }
      }, {
        arrayFilters: [{
          'list.listId': ltId.listId
        }]
      })
    }

    ctx.body = utils.success({}, '任务批量删除成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户任务附件上传接口
router.post('/sendfile/:listId/:taskId/:beforeFileFlag', fileDelete, upload.single('File'), async function (ctx, next){
  let listId = parseInt(ctx.params.listId)
  let taskId = parseInt(ctx.params.taskId)
  
  fileInfo.fileSize = _.round(ctx.file.size / 1024)

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {

    let userId = data._id
    let mainUserId = ''
    let isEditShare = false
    let shareId = ''
    
    if (listId > 300000) {
      const userIdRes = await ShareLists.findOne({ listId }, { _id: false }).select('userId mainListId')
      mainUserId = userIdRes.userId
      userId = userIdRes.userId
      shareId = listId
      listId = userIdRes.mainListId
      isEditShare = true
    } else {
      mainUserId = data._id
      userId = data._id
      const shareRes = await ShareLists.findOne({ userId, mainListId: listId }, { _id: false }).select('listId')
      if (shareRes) {
        isEditShare = true
        shareId = shareRes.listId
      }
    }

    await Tasks.findOneAndUpdate({ userId }, {
      '$set': {
        'allTasks.$[list].listTasks.$[task].taskFile': fileInfo,
      }
    }, {
      arrayFilters: [{
        'list.listId': listId
      }, {
        'task.taskId': taskId
      }]
    })

    if (isEditShare) {
      await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
        'listTasks.$.taskFile': fileInfo,
      }})
    }

    await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'AFILE', isEditShare, shareId)

    ctx.body = utils.success(fileInfo, '上传成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户任务附件删除接口
router.post('/deletefile/:fileFlag', fileDelete, async function (ctx, next) {
  let { listId, taskId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let userId = data._id
    let mainUserId = ''
    let isEditShare = false
    let shareId = ''
      
    if (listId > 300000) {
      const userIdRes = await ShareLists.findOne({ listId }, { _id: false }).select('userId mainListId')
      mainUserId = userIdRes.userId
      userId = userIdRes.userId
      shareId = listId
      listId = userIdRes.mainListId
      isEditShare = true
    } else {
      mainUserId = data._id
      userId = data._id
      const shareRes = await ShareLists.findOne({ userId, mainListId: listId }, { _id: false }).select('listId')
      if (shareRes) {
        isEditShare = true
        shareId = shareRes.listId
      }
    }

    await Tasks.findOneAndUpdate({ userId }, {
      '$unset': {
        'allTasks.$[list].listTasks.$[task].taskFile': null,
      }
    }, {
      arrayFilters: [{
        'list.listId': listId
      }, {
        'task.taskId': taskId
      }]
    })

    if (isEditShare) {
      await ShareLists.findOneAndUpdate({ $and: [{ listId: shareId }, { 'listTasks.taskId': taskId }] }, {'$set': {
        'listTasks.$.taskFile': null,
      }})
    }

    await addUserTaskDevelopment(data._id, mainUserId, taskId, listId, 'DFILE', isEditShare, shareId)

    ctx.body = utils.success({}, '删除成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户任务邮件通知接口
router.post('/taskmailnotify', async function (ctx,next) {
  const { userName, userMail, taskInfo } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const userRes = await CustomSetting.findOne({ userId: data._id }, { _id: false }).select('notify')

    if (userRes.notify.mailNotify) {
      // 发送的配置项
      const mailOptions ={
        from: '2392859135@qq.com', // 发送方
        to: userMail, //接收者邮箱，多个邮箱用逗号间隔
        subject: 'Any.do任务通知服务', // 标题
        text: `${userName}, ${taskInfo} 任务设定时间已到，请及时处理!`, // 文本内容
      }

      // 发送邮件
      await transporter.sendMail(mailOptions)

      ctx.body = utils.success({}, '发送任务通知邮件成功')
    } else {
      ctx.body = utils.fail('当前用户未开启邮件通知')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router