/*
 * @Author: 胡晨明
 * @Date: 2021-08-24 21:06:11
 * @LastEditTime: 2021-09-19 23:13:55
 * @LastEditors: Please set LastEditors
 * @Description: 加密功能模块
 * @FilePath: \manager-server\utils\cryp.js
 */
const crypto = require('crypto');

// 密钥
const SECRET_KEY = 'HMCCMH_**_&^_7##'

// md5 加密
function md5(content) {
    let md5 = crypto.createHash('md5');
    return md5.update(content).digest('hex');
}

// 加密函数
function genPassword(password) {
    const str = `password=${password}&key=${SECRET_KEY}`;
    return md5(str);
}


module.exports = {
    genPassword
}