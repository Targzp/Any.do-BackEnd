/*
 * @Author: 胡晨明
 * @Date: 2021-10-17 17:05:11
 * @LastEditTime: 2021-10-17 20:59:25
 * @LastEditors: Please set LastEditors
 * @Description: 用户反馈数据导入Excel表模块
 * @FilePath: \Anydo-app-server\utils\writeExcel.js
 */
const xlsx = require('xlsx')

const writeExcel = (filePath, Content) => {
    const wb = xlsx.readFile(filePath)
    const keyArr = []
    
    // 获取反馈数据的相应键
    for (key in Content[0]) {
        keyArr.push(key)
    }

    // 获取当前Excel表第一张表
    const first_sheet_name = wb.SheetNames[0]
    const ws = wb.Sheets[first_sheet_name]

    // 计算写入位置，根据表格当前已写入的范围终点
    const endPoint = parseInt(ws['!ref'].split(':')[1].slice(1))
    const origin = `A${endPoint+1}`

    xlsx.utils.sheet_add_json(ws, Content, { skipHeader: true, origin, header: keyArr })
    xlsx.writeFile(wb, filePath)
}

module.exports = {
    writeExcel
}