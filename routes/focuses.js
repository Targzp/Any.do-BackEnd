/*
 * @Author: 胡晨明
 * @Date: 2022-02-17 14:13:29
 * @LastEditors: 胡晨明
 * @LastEditTime: 2022-03-02 09:58:45
 * @Description: 专注数据接口汇总
 */
const router = require('koa-router')()
const utils = require('../utils/utils')
const Focuses = require('../models/focusSchema')
const Achievements = require('../models/achievementsSchema')
const dayjs = require('dayjs')
const isToday = require('dayjs/plugin/isToday')
const weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)
dayjs.extend(isToday)

router.prefix('/api/focus')

//! 用户获取专注数据
router.get('/getfocuses', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Focuses.findOne({ userId: data._id }, { _id: false }).select('focuses')
    const focuses = result.focuses
    ctx.body = utils.success(focuses, '获取专注数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户获取专注统计数据
router.post('/getfocusstatistics', async function (ctx, next) {
  const { trendMode } = ctx.request.body
  console.log('trendMode: ', trendMode)

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Focuses.findOne({ userId: data._id }, { _id: false }).select('focuses')
    const focusesData = result.focuses
    
    let todayTotal = 0  // 今日完成时间量
    let allTotal = 0    // 总完成时间量
    let doneTotal = 0   // 完成专注量
    let notDoneTotal = 0  // 未完成专注量
    let hour = dayjs().hour() // 当前小时
    let month = dayjs().month() // 当前月
    let week = dayjs().week()   // 当前年的第几周
    let year = dayjs().year()   // 当前年
    const modeObj = {   // 前端图表x轴显示模板数据集合
      day: {
        fore: [0, 1, 2, 3, 4, 5, 6, 7],
        mid: [8, 9, 10, 11, 12, 13, 14, 15],
        after: [16, 17, 18, 19, 20, 21, 22, 23]
      },
      week: [0, 1, 2, 3, 4, 5, 6],
      month: {
        fore: [0, 1, 2, 3, 4, 5],
        after: [6, 7, 8, 9, 10, 11]
      }
    }
    const modeDescObj = { // 前端图表x轴显示模板描述集合
      day: {
        fore: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
        mid: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
        after: ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
      },
      week: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      month: {
        fore: ['一月', '二月', '三月', '四月', '五月', '六月'],
        after: ['七月', '八月', '九月', '十月', '十一月', '十二月']
      }
    }
    let mode = null         // 当前x轴显示数据模板
    let modeDesc = null     // 当前x轴显示描述模板
    const modeDataArr = []  // 图表显示的数据量集合

    // 计算专注时长（今日量和总量）
    // 计算专注完成度（累计已完成专注数量和未完成专注数量）
    focusesData.forEach(item => {
      if (item.focusDoneFlag) {
        if (dayjs(item.focusTime).isToday()) {
          todayTotal += item.focusTotalMinutes
        }

        allTotal += item.focusTotalMinutes

        doneTotal++
      } else {
        notDoneTotal++
      }
    })

    // 计算专注趋势数据量
    if (trendMode === 'day') {
      modeDataArr.length = 8
      modeDataArr.fill(0)
      if (hour <= 7) {
        mode = modeObj.day.fore
        modeDesc = modeDescObj.day.fore
      } else if (hour <= 15) {
        mode = modeObj.day.mid
        modeDesc = modeDescObj.day.mid
      } else if (hour <= 23) {
        mode = modeObj.day.after
        modeDesc = modeDescObj.day.after
      }
      focusesData.forEach(item => {
        if (item.focusDoneFlag && dayjs(item.focusTime).isToday()) {
          const focusTimeHour = dayjs(item.focusTime).hour()
          console.log('focusTimeHour: ', focusTimeHour);
          const index = mode.indexOf(focusTimeHour)
          if (index > -1) {
            modeDataArr[index]++
          }
        }
      })
    } else if (trendMode === 'week') {
      modeDataArr.length = 7
      modeDataArr.fill(0)
      mode = modeObj.week
      modeDesc = modeDescObj.week
      focusesData.forEach(item => {
        if (item.focusDoneFlag) {
          const focusTimeWeek = dayjs(item.focusTime).week()
          const focusTimeYear = dayjs(item.focusTime).year()
          const focusTimeWeekDay = dayjs(item.focusTime).day()
          if (focusTimeWeek === week && focusTimeYear === year) {
            const index = mode.indexOf(focusTimeWeekDay)
            if (index > -1) {
              modeDataArr[index]++
            }
          }
        }
      })
    } else if (trendMode === 'month') {
      modeDataArr.length = 6
      modeDataArr.fill(0)
      if (month <= 5) {
        mode = modeObj.month.fore
        modeDesc = modeDescObj.month.fore
      } else if (month <= 11) {
        mode = modeObj.month.after
        modeDesc = modeDescObj.month.after
      }
      focusesData.forEach(item => {
        if (item.focusDoneFlag) {
          const focusTimeMonth = dayjs(item.focusTime).month()
          const index = mode.indexOf(focusTimeMonth)
          if (index > -1) {
            modeDataArr[index]++
          }
        }
      })
    }

    const res = {
      todayTotal,
      allTotal,
      doneTotal,
      notDoneTotal,
      modeDataArr,
      modeDesc
    }

    ctx.body = utils.success(res, '获取专注统计数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

//! 用户新增专注数据
router.post('/addfocus', async function (ctx, next) {
  const { focusInfo, focusTime, focusTotalMinutes, focusDoneFlag } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const result = await Focuses.findOne({ userId: data._id }, { _id: false }).select('focuses')

    // 如果用户专注数据为空，则创建
    if (!result) {
      const params = { userId: data._id, focuses: [ { focusInfo, focusTime, focusTotalMinutes, focusDoneFlag } ] }
      await Focuses.create(params)
    } else {
      const focusData = { focusInfo, focusTime, focusTotalMinutes, focusDoneFlag }
      await Focuses.findOneAndUpdate({ userId: data._id }, { $push: { focuses: focusData } })
    }

    //* 完成专注增加成就值
    let { achievementScores, scoreByDay } = await Achievements.findOne({ userId: data._id }, { _id: false }).select('achievementScores scoreByDay')
    if (!scoreByDay) {
      scoreByDay = {}
    }
    let scores = achievementScores + 3
    scoreByDay[dayjs().format('YYYYMMDD')] = scores
    await Achievements.findOneAndUpdate({ userId: data._id }, { 'achievementScores':  scores, 'scoreByDay': scoreByDay })

    ctx.body = utils.success({}, '上传专注数据成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router
