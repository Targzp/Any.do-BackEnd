/*
 * @Author: 胡晨明
 * @Date: 2021-12-01 16:44:41
 * @LastEditTime: 2022-01-10 10:14:51
 * @LastEditors: 胡晨明
 * @Description: 任务数据接口汇总
 * @FilePath: \Anydo-app-server\routes\tasks.js
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const Tasks = require('../models/tasksSchema')

router.prefix('/api/tasks')

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
}

//! 用户添加任务数据接口
router.post('/addtask', async function (ctx, next) {
  const { task, listId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const resTask = await addUserTask(data._id, task, listId)
    ctx.body = utils.success(resTask, '添加任务成功')
  } catch (error) {
    ctx.fail = utils.fail(`${error}`)
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
    ctx.fail = utils.fail(`${error}`)
  }
})

//! 用户修改任务相关值接口
router.post('/updatetask', async function (ctx, next) {
  const { listId, taskId, flag, value, extValue } = ctx.request.body
  
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let res
    // 根据 flag 值对任务特定值进行修改
    // arrayFilters 过滤器可以将符合条件的字段筛选出来，再进行你想要的的操作
    switch (flag) {
      case 'done':
        res = await Tasks.findOneAndUpdate({ userId: data._id },{
          '$set': {
            'allTasks.$[list].listTasks.$[task].doneFlag': value,
            'allTasks.$[list].listTasks.$[task].doneTime': extValue,
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }],
          new: true
        })
        break
      case 'softDel':
        res = await Tasks.findOneAndUpdate({ userId: data._id }, {
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
        break
      case 'setList':
        await deleteUserTask(data._id, listId, taskId)  // 将任务从原清单中删除
        res = await addUserTask(data._id, extValue, value) // 将任务添加进新清单
        res = res.taskId
        break
      case 'setTaskInfo':
        res = await Tasks.findOneAndUpdate({ userId: data._id }, {
          '$set': {
            'allTasks.$[list].listTasks.$[task].taskInfo': value
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }],
          new: true
        })
        break
      case 'setTaskDesc':
        res = await Tasks.findOneAndUpdate({ userId: data._id }, {
          '$set': {
            'allTasks.$[list].listTasks.$[task].taskDesc': value
          }
        }, {
          arrayFilters: [{
            'list.listId': listId
          }, {
            'task.taskId': taskId
          }],
          new: true
        })
        break
      case 'setTaskPriority':
        res = await Tasks.findOneAndUpdate({ userId: data._id }, {
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
        break
      default:
        break
    }
    ctx.body = utils.success(res, '任务值修改成功')
  } catch (error) {
    ctx.fail = utils.fail(`${error}`)
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
    ctx.fail = utils.fail(`${error}`)
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
    ctx.fail = utils.fail(`${error}`)
  }
})

module.exports = router