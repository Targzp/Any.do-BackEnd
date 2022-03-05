/*
 * @Author: 胡晨明
 * @Date: 2021-09-17 21:10:48
 * @LastEditTime: 2022-03-03 22:14:37
 * @LastEditors: 胡晨明
 * @Description: 用户登录、注册、验证码发送接口
 * @FilePath: \Anydo-app-server\routes\users.js
 */
const path = require('path')
const router = require('koa-router')()
const multer = require('@koa/multer')
const utils = require('../utils/utils')
const { transporter } = require('../utils/sendmail')
const { genPassword } = require('../utils/cryp')
const jwt = require('jsonwebtoken')
const dayjs = require('dayjs')
const isToday = require('dayjs/plugin/isToday')
const User = require('../models/userSchema')
const Code = require('../models/codeSchema')
const CustomSetting = require('../models/customSettingsSchema')
const Lists = require('../models/listsSchema')
const Achievements = require('../models/achievementsSchema')
dayjs.extend(isToday)

router.prefix('/api/users')

// 图片标识
let flag = ''

// 文件上传基本配置
let storage = multer.diskStorage({
  // 文件保存路径
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname + '/../assets/avatars'))
  },
  // 修改文件名称
  filename: function (req, file, cb) {
    flag = Date.now().toString(16) + "." + "jpg"
    cb(null, flag)
  }
})

// 加载配置
let upload = multer({ storage })

// 头像图片删除中间件
const avatarDelete = async (ctx, next) => {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)
  try {
    const user = await User.findById({ _id: data._id })
    const fileName = user.userAvatar
    if (fileName !== ' ') {
      utils.deleteFile(fileName, 'avatar')
    }
    await next()
  } catch (error) {
    ctx.body = utils.fail(`Error: ${error}`)
  }
}

// 邮箱验证码检测中间件
const verifyCode = async (ctx, next) => {
  let { userMail, userCode } = ctx.request.body
  // 增强通用性，有 userMail 字段才进行验证码检测
  if (userMail) {
    try {
      const res = await Code.findOne({ userMail, userCode })
      // 验证验证码是否存在
      if (res) {
        await next()
      } else {
        ctx.body = utils.fail('验证码错误')
        return
      }
    } catch (error) {
      ctx.body = utils.fail(`Error: ${error}`)
    }
  } else {
    await next()
  }
}

// 计算用户使用天数和上次登录时间工具函数
const countUserUseDays = async (id) => {
  const res = await User.findById({ _id: id }, { _id: false }).select('useDays lastLoginTime')

  let useDays = res.useDays || 0
  let lastLoginTime = res.lastLoginTime || dayjs().valueOf()

  if (!useDays) {
    useDays = 1

    await User.findByIdAndUpdate({ _id: id }, {
      useDays,
      lastLoginTime
    })

    return
  }

  if (!(dayjs(lastLoginTime).isToday())) {
    useDays++
    lastLoginTime = dayjs().valueOf()

    await User.findByIdAndUpdate({ _id: id }, {
      useDays,
      lastLoginTime
    })
  } else {
    lastLoginTime = dayjs().valueOf()

    await User.findByIdAndUpdate({ _id: id }, {
      lastLoginTime
    })
  }
}

// 邮箱验证专用接口
router.post('/verifycode', verifyCode, async function (ctx, next) {
  ctx.body = utils.success({}, '验证成功')
})

// 注册接口
router.post('/register', verifyCode, async function (ctx, next) {
  let { userName, userPwd, userMail } = ctx.request.body
  try {
      // 验证用户名唯一
      const verifyNameRepeat = await User.findOne({ userName })
      if (verifyNameRepeat) {
        ctx.body = utils.fail('用户名已注册')
        return
      }

      // 验证邮箱唯一
      const verifyMailRepeat = await User.findOne({ userMail })
      if (verifyMailRepeat) {
        ctx.body = utils.fail('邮箱已注册')
        return
      }

      userPwd = genPassword(userPwd)  // 注册密码加密
      const params = { userName, userPwd, userMail, userAvatar: ' ' }
      const res = await User.create(params)             // 用户数据存储
      await Lists.create({ userId: res._id })           // 清单数据初始化
      await CustomSetting.create({ userId: res._id })   // 用户自定义设置初始化
      await Achievements.create({ userId: res._id })    // 用户成就值初始化
      ctx.body = utils.success({}, '注册成功')
  } catch (error) {
    ctx.body = utils.fail(`Error: ${error}`)
  }
})

// 登录接口
router.post('/login', verifyCode, async function (ctx, next) {
  let { userName, userPwd, userMail } = ctx.request.body
  let res = null
  try {
    // 使用用户名+密码登录
    if (userName) {
      userPwd = genPassword(userPwd)
      res = await User.findOne({ userName, userPwd }, '_id userName userSex userMail userBirthday userAvatar')
      if (!res) {
        ctx.body = utils.fail('账户或密码不正确')
        return
      }
    }
    
    // 使用邮箱登录
    if (userMail) {
      res = await User.findOne({ userMail }, '_id userName userSex userMail userBirthday userAvatar')
      if (!res) {
        ctx.body = utils.fail('该邮箱尚未注册')
        return
      }
    }

    // 生成 token
    const token = jwt.sign({ exp: Math.floor(Date.now() / 1000) + (86400 * 2), data: res }, 'Anydo#32')
    res._doc.token = token
    ctx.session.userId = res._id

    await countUserUseDays(res._id)

    ctx.body = utils.success(res)
  } catch (error) {
    ctx.body = utils.fail(`Error: ${error}`)
  }
})

// 获取用户信息接口
router.get('/profile', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)
  try {
    let res = await User.findById({ _id: data._id }, '_id userName userSex userMail userBirthday userAvatar')
    ctx.body = utils.success(res, '用户个人信息')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 上传用户信息接口
router.post('/userprofile', async function (ctx, next) {
  const params = { ...ctx.request.body }
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)
  try {
    let res = await User.findByIdAndUpdate({ _id: data._id }, params, { new: true }).select('userName userSex userBirthday userAvatar')
    ctx.body = utils.success(res, '修改成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 检测用户重名接口
router.post('/checkusername', async function (ctx, next) {
  const { userName } = ctx.request.body
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)
  try {
    let res = await User.findOne({ userName: userName }).ne('_id', data._id)
    if (res) {
      ctx.body = utils.success(true, '用户名已存在')
    } else {
      ctx.body = utils.success(false, '用户名不存在')
    }
  } catch (error) {
    console.log(`${error}`)
  }
})

// 密码更新接口
router.post('/updatepassword', async function (ctx, next) {
  let { oldPwd, newPwd } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  newPwd = genPassword(newPwd)

  try {
    // 检测是否有旧密码
    if (oldPwd) {
      oldPwd = genPassword(oldPwd)
      let res = await User.findById({ _id: data._id })
      if (oldPwd !== res.userPwd) {
        ctx.body = utils.fail('密码不正确')
        return
      }
    }
  
    await User.findByIdAndUpdate({ _id: data._id }, { userPwd: newPwd })
  
    ctx.body = utils.success({}, '更改成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }

})

// 邮箱绑定更新接口
router.post('/updatebindmail', verifyCode, async function (ctx, next) {
  let { userMail } = ctx.request.body

  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    // 验证邮箱唯一
    const verifyMailRepeat = await User.findOne({ userMail })
    if (verifyMailRepeat) {
      ctx.body = utils.fail('邮箱已注册')
      return
    }
  
    await User.findByIdAndUpdate({ _id: data._id }, { userMail })
  
    ctx.body = utils.success({}, '绑定成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 用户注销账户接口
router.post('/deleteaccount', verifyCode, avatarDelete, async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    let res = await User.findByIdAndRemove({ _id: data._id })
    if (res) {
      await CustomSetting.findOneAndRemove({ userId: data._id })
      ctx.body = utils.success({}, '注销成功')
    } else {
      ctx.body = utils.fail('注销失败')
    }
  } catch (error) {
    ctx.body = utils.fail(`注销失败: ${error}`)
  }
})

// 验证码发送接口
router.post('/sendcode', async function (ctx, next) {
  const { userMail } = ctx.request.body
  let userCode = Math.floor(Math.random() * 8998 + 1001)  // 在 1001~9998 之间随机生成数字作为验证码
  let exceedTime = 300000 // 设定验证码超时时间
  // 发送的配置项
  const mailOptions ={
    from: '2392859135@qq.com', // 发送方
    to: userMail, //接收者邮箱，多个邮箱用逗号间隔
    subject: 'Any.do验证码服务', // 标题
    text: `您的验证码为: ${userCode}, 5分钟内有效`, // 文本内容
  }
  const params = { userMail, userCode, exceedTime }
  try {
    // 验证码暂存数据库
    await Code.create(params)

    // 发送邮件
    await transporter.sendMail(mailOptions)

    // 设定超时时间，超时删除验证码
    setTimeout(async () => {
      await Code.findOneAndRemove({userMail, userCode})
    }, exceedTime)
    
    ctx.body = utils.success({}, '发送成功')
  } catch (error) {
    ctx.body = utils.fail(`发送失败, 请检查邮箱是否存在`)
  }
})

// 用户图像上传接口
router.post('/sendimg', avatarDelete, upload.single('Avatar'), async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)
  try {
    await User.findByIdAndUpdate({
      _id: data._id
    }, {
      userAvatar: flag
    })
    ctx.body = utils.success({ url: flag }, '上传成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 用户搜索接口
router.post('/search', async function (ctx, next) {
  const { userInfo } = ctx.request.body

  try {
    const res = await User.findOne({ $or: [{ userName: userInfo }, { userMail: userInfo  }] }).select('userName userMail')

    if (res) {
      ctx.body = utils.success(res, '搜索成功')
    } else {
      ctx.body = utils.success({}, '未找到')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 用户计算使用天数接口
router.post('/countusedays', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    await countUserUseDays(data._id)

    ctx.body = utils.success({}, '计算当前用户使用天数成功')
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

// 用户获取使用天数接口
router.get('/getusedays', async function (ctx, next) {
  let auth = ctx.request.headers.authorization
  let {
    data
  } = utils.decoded(auth)

  try {
    const res = await User.findById({ _id: data._id }).select('useDays')

    if (res) {
      ctx.body = utils.success({ useDays: res.useDays }, '获取用户使用天数成功')
    } else {
      ctx.body = utils.success({}, '用户暂无使用天数')
    }
  } catch (error) {
    ctx.body = utils.fail(`${error}`)
  }
})

module.exports = router
