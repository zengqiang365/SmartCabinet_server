const fs = require('fs');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const key = 'J8S!Hfe94thSA%r3';
const loginTokens = new Map();
const moment = require('moment');

class BusinessError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'BusinessError';
        this.message = message;
        this.code = code || '0001';
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {

    parseMsg(action, payload = {}, metadata = {}) {
        const meta = Object.assign({}, {
            timestamp: Date.now(),
        }, metadata);

        return {
            meta,
            data: {
                action,
                payload,
            },
        };
    },
    getWeekDay(day) {
        let weekDay = null;
        switch (day) {
        case 1:
            weekDay = '星期一';
            break;
        case 2:
            weekDay = '星期二';
            break;
        case 3:
            weekDay = '星期三';
            break;
        case 4:
            weekDay = '星期四';
            break;
        case 5:
            weekDay = '星期五';
            break;
        case 6:
            weekDay = '星期六';
            break;
        default:
            weekDay = '星期日';
        }
        return weekDay;
    },
    calculateWorkDays(startTime, endTime) {
        let currentDay = moment(startTime); // 当前用于判断的时间(默认为开始时间)
        let workDays = 0;
        while (currentDay.isBetween(startTime, endTime, 'day', '[]')) {
            if (currentDay.day() !== 6 && currentDay.day() !== 0) {
                workDays++;
            }
            currentDay = currentDay.add(1, 'days');
        }
        return workDays * 8;
    },
    calculateUseHours(startTime, endTime) {
        let currentDay = moment(startTime); // 当前用于判断的时间(默认为开始时间)
        let workDays = 0;
        while (currentDay.isBetween(startTime, endTime, 'hour', '[]')) {
            if (currentDay.day() !== 6 && currentDay.day() !== 0) {
                workDays++;
            }
            currentDay = currentDay.add(1, 'days');
        }
        return workDays * 8;
    },
    // 生成字符串的md5校验
    _getStrHash(s) {
        const md5 = crypto.createHash('md5'); // 使用md5的方式生成字符串
        md5.update(s);
        return md5.digest('hex');
    },
    // 生成文件的md5校验
    md5check(path) {
        return new Promise(function(resolve, reject) {
            const md5sum = crypto.createHash('md5');
            const stream = fs.createReadStream(path);
            stream.on('data', function(chunk) {
                md5sum.update(chunk);
            });
            stream.on('end', function() {
                const str = md5sum.digest('hex').toUpperCase();
                resolve(str);
            });
            stream.on('error', function(err) {
                reject(err);
            });
        });
    },
    encodeStr(str) {
        const ciphertext = CryptoJS.AES.encrypt(str, key).toString();
        return ciphertext;
    },
    decodeStr(str) {
        const decrypted = CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8);
        return decrypted;
    },
    // 生成uuid
    getUUID() {
        return crypto.randomUUID();
    },

    throwBusinessError(message, code) {
        throw new BusinessError(message, code);
    },
    /**
     * 判断字符串是否全是中文
     * @param {String} str
     */
    isChineseString(str) {
        return new RegExp('^[\u4e00-\u9fa5]{0,}$').test(str);
    },
    /**
     * 判断字符串是否全是数字
     * @param {String} str
     */
    isNumberString(str) {
        return new RegExp('^[0-9]{0,}$').test(str);
    },
    addToken(userInfo) {
        loginTokens.set(userInfo.username, userInfo.token);
    },
    deleteUserToken(userInfo) {
        if (loginTokens.has(userInfo.username)) {
            loginTokens.delete(userInfo.username);
        }
    },
    deleteToken(token) {
        let key = null;
        for (const [k, val] of loginTokens.entries()) {
            if (val == token) {
                key = k;
                break;
            }
        }
        if (key) {
            loginTokens.delete(key);
        }
    },
    verifyToken(token) {
        if (Array.from(loginTokens.values()).includes(token)) {
            return true;
        }
        return false;
    },
};
