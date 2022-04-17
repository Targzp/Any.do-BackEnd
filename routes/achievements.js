/*
 * @Author: 胡晨明
 * @Date: 2022-02-28 16:28:09
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-03-09 00:22:48
 * @Description: 成就数据接口汇总
 */
const fs = require('fs')
const router = require('koa-router')()
const utils = require('../utils/utils')
const User = require('../models/userSchema')
const Lists = require('../models/listsSchema')
const Tasks = require('../models/tasksSchema')
const ShareLists = require('../models/sharelistsSchema')
const Achievements = require('../models/achievementsSchema')
const _ = require('lodash')
const dayjs = require('dayjs')

router.prefix('/api/achievements')

//! 用户获取成就值数据
router.get('/getachievementscores', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await Achievements.findOne({ userId: data._id }, { _id: false }).select('achievementScores scoreByDay')

    if (res) {
      //* 计算并获取近五天成就值
      const scoreByDay = res.scoreByDay || {}
      // 近五天时间模板对象
      const postScoreByDay = {
        [dayjs().format('YYYYMMDD')]: 0,
        [dayjs().subtract(1, 'day').format('YYYYMMDD')]: 0,
        [dayjs().subtract(2, 'day').format('YYYYMMDD')]: 0,
        [dayjs().subtract(3, 'day').format('YYYYMMDD')]: 0,
        [dayjs().subtract(4, 'day').format('YYYYMMDD')]: 0
      }

      if (!_.isEmpty(scoreByDay)) {
        let postKeys = Object.keys(postScoreByDay)  // 获取近五天时间模板日期 keys
        console.log('postKeys: ', postKeys);
        let scoreKeys = Object.keys(scoreByDay)     // 获取所有成就变动日期 keys
        let lastkey = scoreKeys[scoreKeys.length - 1] // 获取最新成就变动日期 key

        postKeys.reverse()  // 日期 keys 颠倒，让最新的日期 key 排最前
        scoreKeys.reverse()
        postScoreByDay[postKeys[0]] = scoreByDay[lastkey] // anyway，当天的成就值总是与最新成就变动日期的成就值相同

        postKeys.forEach((item, index) => {
          console.log('item: ', item)
          if (index === 0) {
            return
          } else {
            const key = scoreKeys.find(item2 => item2 === item) // 查找是否与近五天相同的日期 key 并返回
            console.log('key: ', key)

            // ((postKeys[1] === lastkey) || (postKeys[0] === lastkey))
            if (scoreKeys.length < 5 && !key) {
              const key2 = scoreKeys.find(item3 => +item3 < +(postKeys[index]))
              console.log('key2: ', key2);
              if (key2) {
                postScoreByDay[item] = scoreByDay[key2]
              } else {
                postScoreByDay[item] = 0
              }
            } else {
              if (key) {
                postScoreByDay[item] = scoreByDay[key]
              } else {
                postScoreByDay[item] = postScoreByDay[postKeys[index - 1]]  // 如果不在近五天日期 keys 中，则该天成就值与后一天相同
              }
            }
          }
        })
      }

      const params = {
        achievementScores: res.achievementScores,
        scoreByDay: postScoreByDay
      }
      ctx.body = utils.success(params, '获取成就值数据成功')
    } else {
      ctx.body = utils.success({}, '成就值数据为空')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户获取任务、已完成任务以及清单数量
router.get('/gettdltotal', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let tasksTotal = 0
    let doneTasksTotal = 0
    const tasksRes = await Tasks.findOne({ userId: data._id }, { _id: false }).select('allTasks')

    if (tasksRes && tasksRes.allTasks) {
      tasksRes.allTasks.forEach(item => {
        if (item.listTasks) {
          // 计算任务以及已完成任务数量
          item.listTasks.forEach(item => {
            if (!item.softDelFlag) {
              tasksTotal++
            }

            if (item.doneFlag && !item.softDelFlag) {
              doneTasksTotal++
            }
          })
        }
      })
    }

    let listsTotal = 0
    const listsRes = await Lists.findOne({ userId: data._id }, { _id: false }).select('allLists')
    const shareListsRes = await ShareLists.find({ listShareIds: { $elemMatch: { $eq: data._id } } })
    console.log('shareListsRes: ', shareListsRes)
    
    if (listsRes && listsRes.allLists) {
      listsTotal += listsRes.allLists.length
    }

    if (shareListsRes.length > 0) {
      listsTotal += shareListsRes.length
    }

    const params = {
      tasksTotal,
      doneTasksTotal,
      listsTotal
    }

    ctx.body = utils.success(params, '获取用户任务和已完成任务以及清单数量成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router
