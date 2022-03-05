/*
 * @Author: 胡晨明
 * @Date: 2022-02-23 17:54:38
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-03-02 16:20:38
 * @Description: 习惯打卡接口汇总
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const Habits = require('../models/habitsSchema')
const Achievements = require('../models/achievementsSchema')
const _ = require('lodash')
const dayjs = require('dayjs')
const isToday = require('dayjs/plugin/isToday')
const isYesterday = require('dayjs/plugin/isYesterday')
const dayOfYear = require('dayjs/plugin/dayOfYear')
dayjs.extend(isToday)
dayjs.extend(isYesterday)
dayjs.extend(dayOfYear)

router.prefix('/api/habit')

//! 用户获取打卡数据
router.get('/gethabits', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Habits.findOne({ userId: data._id }, { _id: false }).select('habits')
    const habits = []

    if (result && result.habits.length > 0) {
      result.habits.forEach(item => {
        if (!item.doneFlag) {
          habits.push(item)
        }
      })

      ctx.body = utils.success(habits, '获取用户打卡数据成功!')
    } else {
      ctx.body = utils.success([], '用户打卡数据为空')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户获取已归档打卡数据
router.get('/getdonehabits', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Habits.findOne({ userId: data._id }, { _id: false }).select('habits')
    const doneHabits = []

    if (result && result.habits.length > 0) {
      result.habits.forEach(item => {
        if (item.doneFlag) {
          doneHabits.push(item)
        }
      })

      ctx.body = utils.success(doneHabits, '获取用户已归档打卡数据成功!')
    } else {
      ctx.body = utils.success([], '用户已归档打卡数据为空')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户新增打卡数据
router.post('/addhabit', async function (ctx, next) {
  const { habitData } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Habits.findOne({ userId: data._id }, { _id: false }).select('habits')

    habitData.doneFlag = false

    // 如果用户专注数据为空，则创建
    if (!result) {
      habitData.habitId = 400001
      const params = { userId: data._id, habits: [ habitData ] }
      await Habits.create(params)
    } else {
      if (result.habits.length === 0) {
        habitData.habitId = 400001
      } else {
        habitData.habitId = result.habits[result.habits.length - 1].habitId + 1
      }
      await Habits.findOneAndUpdate({ userId: data._id }, { $push: { habits: habitData } })
    }

    ctx.body = utils.success(habitData, '新增习惯打卡数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户删除打卡数据
router.post('/deletehabit', async function (ctx, next) {
  const { habitId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    await Habits.findOneAndUpdate({ userId: data._id }, { $pull: { habits: { habitId } } })
    ctx.body = utils.success({}, '习惯打卡数据删除成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户修改打卡数据
router.post('/edithabit', async function (ctx, next) {
  const { habitData } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const { habitId, habitName, habitFre, habitIns, notifyTime, insistDays } = habitData

    // 如果设置坚持天数小于等于当前习惯已坚持天数，则设置习惯打卡数据为已归档
    if (habitIns <= insistDays) {
      habitData.doneFlag = true
      habitData.doneTime = new Date().valueOf()
    }

    await Habits.findOneAndUpdate({ $and: [{ userId: data._id }, { 'habits.habitId': habitId}] }, { $set: {
      'habits.$.habitName': habitName,
      'habits.$.habitFre': habitFre,
      'habits.$.notifyTime': notifyTime,
      'habits.$.habitIns': habitIns,
      'habits.$.doneFlag': !!habitData.doneFlag,
      'habits.$.doneTime': habitData.doneTime?habitData.doneTime:'',
    } })

    ctx.body = utils.success(habitData, '修改习惯打卡数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户习惯进行打卡操作
router.post('/habitclock', async function (ctx, next) {
  /* 
    habitId: 习惯打卡数据 ID 值
    insistDays: 打卡后的坚持天数
    clockValue: 打卡/取消打卡标记
    insistTime: 取消打卡的时间戳
  */
  const { habitId, habitIns, insistDays, clockValue, insistTime } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let res = null
    let resHabit = null
    
    //* 获取当前成就值
    let { achievementScores, scoreByDay } = await Achievements.findOne({ userId: data._id }, { _id: false }).select('achievementScores scoreByDay')
    if (!scoreByDay) {
      scoreByDay = {}
    }
    let scores = 0  // 计算成就值

    if (clockValue) {
      if (habitIns === insistDays) {
        res = await Habits.findOneAndUpdate({ $and: [{ userId: data._id }, { 'habits.habitId': habitId }] }, {
          $set: {
            'habits.$.insistDays': insistDays,
            'habits.$.doneFlag': true,
            'habits.$.doneTime': new Date().valueOf(),
          },
          $push: {
            'habits.$.insistTimeRecords': new Date().valueOf()
          }
        }, { new: true })

        //* 打卡周期完成增加成就值
        scores = achievementScores + 3
        scoreByDay[dayjs().format('YYYYMMDD')] = scores
      } else {
        res = await Habits.findOneAndUpdate({ $and: [{ userId: data._id }, { 'habits.habitId': habitId }] }, {
          $set: {
            'habits.$.insistDays': insistDays
          },
          $push: {
            'habits.$.insistTimeRecords': new Date().valueOf()
          }
        }, { new: true })
      }

      //* 打卡一次增加成就值
      if (scores === 0) {
        if (res) {
          res.habits.forEach(item => {
            if (item.habitId === habitId) {
              resHabit = item
            }
          })

          if (resHabit.insistTimeRecords && resHabit.insistTimeRecords.length > 0 && dayjs(resHabit.insistTimeRecords[resHabit.insistTimeRecords.length - 2]).isYesterday()) {
            scores = achievementScores + 2
          } else {
            scores = achievementScores + 1
          }

          scoreByDay[dayjs().format('YYYYMMDD')] = scores
        }
      }
    } else {
      res = await Habits.findOneAndUpdate({ $and: [{ userId: data._id }, { 'habits.habitId': habitId }] }, {
        $set: {
          'habits.$.insistDays': insistDays
        },
        $pull: {
          'habits.$.insistTimeRecords': insistTime
        }
      }, { new: true })

      //* 取消打卡一次减少成就值
      if (res) {
        res.habits.forEach(item => {
          if (item.habitId === habitId) {
            resHabit = item
          }
        })

        if (resHabit.insistTimeRecords && resHabit.insistTimeRecords.length > 0 && dayjs(resHabit.insistTimeRecords[resHabit.insistTimeRecords.length - 1]).isYesterday()) {
          scores = achievementScores - 2
        } else {
          scores = achievementScores - 1
        }

        scoreByDay[dayjs().format('YYYYMMDD')] = scores
      }
    }
    //* 数据库重新设定成就值
    await Achievements.findOneAndUpdate({ userId: data._id }, { 'achievementScores':  scores, 'scoreByDay': scoreByDay })

    if (res && !resHabit) {
      res.habits.forEach(item => {
        if (item.habitId === habitId) {
          resHabit = item
        }
      })
    }

    ctx.body = utils.success(resHabit, '用户打卡/取消打卡成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//* 在时间戳数组中找到最高连续天数工具函数
const findHightContinuity = (insistTimeRecords) => {
  let tempTotal = 0
  let total = 0

  insistTimeRecords.forEach((item, index) => {
    if ((dayjs(item).add(1, 'day')).isSame(dayjs(insistTimeRecords[index + 1]), 'day')) {
      tempTotal++
    } else {
      if (tempTotal !== 0) {
        tempTotal++

        if (total === 0 || total < tempTotal) {
          total = tempTotal
        }

        tempTotal = 0
      }
    }
  })

  if (insistTimeRecords.length > 0 && total === 0) {
    total = 1
  }

  return total
}

//* 在时间戳数组中找到当前连续天数工具函数
const findCurrentContinuity = (insistTimeRecords) => {
  let total = 0
  const newInsistTime = insistTimeRecords[insistTimeRecords.length - 1]

  if (dayjs(newInsistTime).isToday() || dayjs(newInsistTime).isYesterday()) {
    total++

    const insistTimeRecordsReverse = (_.cloneDeep(insistTimeRecords)).reverse()

    insistTimeRecordsReverse.forEach((item, index) => {
      if (index === 0) {
        return
      } else {
        if ((dayjs(item).add(1, 'day')).isSame(dayjs(insistTimeRecordsReverse[index - 1]), 'day')) {
          total++
        }
      }
    })
  }

  return total
}

//! 用户获取打卡统计数据
router.post('/gethabitsstatistics', async function (ctx, next) {
  const { habitId } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let habitClockTotal = 0       // 习惯打卡数据总打卡量
    let habitHighContinuity = 0  // 习惯打卡数据最高连续天数
    let habitCurrentContinuity = 0  // 习惯打卡数据当前连续天数
    let toDoneDays = 0            // 习惯打卡距离达成天数

    const result = await Habits.findOne({ userId: data._id }, { _id: false }).select('habits')
    let habit = null
    result.habits.forEach(item => {
      if (item.habitId === habitId) {
        habit = item
      }
    })

    habitClockTotal = habit.insistDays  // 获取总打卡量
    toDoneDays = habit.habitIns - habit.insistDays  // 获取距离达成天数

    if (habit.insistTimeRecords && habit.insistTimeRecords.length > 0) {
      habitHighContinuity = findHightContinuity(habit.insistTimeRecords) // 获取最高连续天数
      habitCurrentContinuity = findCurrentContinuity(habit.insistTimeRecords) // 获取当前连续天数
    }
    
    ctx.body = utils.success({ habitClockTotal, habitHighContinuity, habitCurrentContinuity, toDoneDays }, '获取打卡统计数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router