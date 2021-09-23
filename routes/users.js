/*
 * @Author: 胡晨明
 * @Date: 2021-09-17 21:10:48
 * @LastEditTime: 2021-09-23 23:43:44
 * @LastEditors: Please set LastEditors
 * @Description: 用户登录、注册、验证码发送接口
 * @FilePath: \Anydo-app-server\routes\users.js
 */
const router = require('koa-router')()
const multer = require('koa-multer')
const utils = require('../utils/utils')
const { transporter } = require('../utils/sendmail')
const { genPassword } = require('../utils/cryp')
const jwt = require('jsonwebtoken')
const User = require('../models/userSchema')
const Code = require('../models/codeSchema')

router.prefix('/api/users')

// 图片随机时间戳
const flag = Date.now()

// 文件上传基本配置
let storage = multer.diskStorage({
  // 文件保存路径
  destination: function (req, file, cb) {
    cb(null, __dirname + '/../assets/avatars')
  },
  // 修改文件名称
  filename: function (req, file, cb) {
    let fileFormat = file.originalname.split(".")
    cb(null, flag + "." + "jpg")
  }
})

// 加载配置
let upload = multer({ storage: storage })

// 注册接口
router.post('/register', async function (ctx, next) {
  let { userName, userPwd, userMail, userCode } = ctx.request.body
  try {
    const res = await Code.findOne({userMail, userCode})
    // 验证验证码是否存在
    if (res) {
      const nowTime = Date.now()  // 获取当前时间
      // 验证验证码是否过期
      if (nowTime < res.exceedTime) {
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
        const params = { userName, userPwd, userMail }
        await User.create(params)
        await Code.findOneAndRemove({userMail, userCode})
        ctx.body = utils.success({}, '注册成功')
      } else {
        await Code.findOneAndRemove({userMail, userCode})
        ctx.body = utils.fail('验证码已过期')
      }
    } else {
      ctx.body = utils.fail('验证码错误')
    }
  } catch (error) {
    ctx.body = utils.fail(`Error: ${error}`)
  }
})

// 登录接口
router.post('/login', async function (ctx, next) {
  let { userName, userPwd, userMail, userCode } = ctx.request.body
  let res = null
  try {
    // 使用用户名+密码登录
    if (userName) {
      userPwd = genPassword(userPwd)
      res = await User.findOne({ userName, userPwd }, '_id userName userMail')
      if (!res) {
        ctx.body = utils.fail('账户或密码不正确')
        return
      }
    }
    // 使用邮箱登录
    if (userMail) {
      const verifyRes = await Code.findOne({userMail, userCode})
      if (verifyRes) {
        const nowTime = Date.now()
        if (nowTime < verifyRes.exceedTime) {
          await Code.findOneAndRemove({userMail, userCode})
          res = await User.findOne({ userMail }, '_id userName userMail')
          if (!res) {
            ctx.body = utils.fail('该邮箱尚未注册')
            return
          }
        } else {
          await Code.findOneAndRemove({userMail, userCode})
          ctx.body = utils.fail('验证码已过期')
        }
      } else {
        ctx.body = utils.fail('验证码错误')
      }
    }
    // 生成 token
    const token = jwt.sign({ data: res }, 'Anydo#32', { expiresIn: '3d' })
    res._doc.token = token
    ctx.body = utils.success(res)
  } catch (error) {
    ctx.body = utils.fail(`Error: ${error}`)
  }
})

// 验证码发送接口
router.post('/sendcode', async function (ctx, next) {
  const { userMail } = ctx.request.body
  let userCode = Math.floor(Math.random() * 8998 + 1001)  // 在 1001~9998 之间随机生成数字作为验证码
  let exceedTime = Date.now() + 300000  // 设定验证码超时时间
  // 发送的配置项
  const mailOptions ={
    from: '2392859135@qq.com', // 发送方
    to: userMail, //接收者邮箱，多个邮箱用逗号间隔
    subject: '个人事务贴身管家验证码服务', // 标题
    text: `您的验证码为：${userCode}，5分钟内有效`, // 文本内容
  }
  const params = { userMail, userCode, exceedTime }
  try {
    await Code.create(params)
    await transporter.sendMail(mailOptions)
    ctx.body = utils.success({}, '发送成功')
  } catch (error) {
    console.log(error)
    ctx.body = utils.fail(`发送失败，请检查邮箱是否存在`)
  }
})

// 用户图像上传接口
router.post('/sendimg', upload.single('Avatar'), async function (ctx, next) {
  ctx.body = utils.success({ url: flag }, '上传成功')
})

module.exports = router
