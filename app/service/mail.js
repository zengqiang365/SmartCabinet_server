/**
 * Created by sunzq on 2022/09/13
 */
const _ =  require('lodash');
const moment = require('moment');
const nodemailer = require('nodemailer');

module.exports = app => {
    const Service = require('egg').Service;
    // create reusable transporter object using the default SMTP transport
    const transporter = null;
    // const transporter = nodemailer.createTransport({
    //     host: 'smtp.163.com',
    //     port: 25,
    //     secure: false, // true for 465, false for other ports
    //     auth: {
    //         user: app.config.mail.user, // generated ethereal user
    //         pass: app.config.mail.pass, // generated ethereal password
    //     },
    // });

    return class mailService extends Service {

        // 获取邮件列表
        async getMailList(pageObj, cond) {
            const mailInfo = await app.mysql.select('mail', {
                where: cond,
                orders: [['id', 'desc']],
                limit: pageObj.limit,
                offset: pageObj.skip
            });
            if (!mailInfo) {
                return null;
            }
            _(mailInfo).forEach(function(obj) {
                obj.time = moment(obj.time).format('YYYY-MM-DD HH:mm:ss');
            });
            return mailInfo;
        }
        // 获取邮件总数
        async getCount(pageObj, cond) {
            const totalNum = await app.mysql.count('mail', cond);
            const totalPage = Math.ceil(totalNum / pageObj.pageSize);
            return { totalNum, totalPage };
        }
        // 按照id查找邮件
        async findMailById(id) {
            const result = await app.mysql.get('mail', { id });
            return result;
        }
        // 增加邮件
        async addMail(mailData) {
            const result = await app.mysql.insert('mail', mailData);
            return result;
        }
        // 删除邮件
        async deleteMails(ids) {
            const result = await app.mysql.delete('mail', { id: ids });
            return result;
        }
        // 发送报修邮件
        async sendRepairMail(mailData) {
            const { ctx } = this;
            let err = null;
            const repaireType = ctx.constants.REPAIR_TYPE;
            const mailType = ctx.constants.MAIL_TYPE;
            switch (mailData.repair) {
            case repaireType.BROKEN:
                err = '设备损坏';
                break;
            case repaireType.PART_BROKEN:
                err = '配件损坏或遗失';
                break;
            case repaireType.RFID:
                err = 'RFID标签损坏';
                break;
            case repaireType.UNKNOWN:
                err = '未知故障';
                break;
            default:
                err = '无';
            }
            const mailContent =
            `有仪器损坏，请及时修理。 信息如下：
                货柜编码：${mailData.container_code}， 
                格口编码：${mailData.grid_code}，
                资产编码：${mailData.asset_code}，
                资产名称：${mailData.asset_name}，
                报修问题：${err}`;
            // send mail with defined transport object
            const info = await transporter.sendMail({
                from: `"智能柜管理系统" ${app.config.mail.from}`, // sender address
                to: app.config.mail.repairMail, // list of receivers
                subject: '仪器报修', // Subject line
                text: mailContent
            });
            console.log('Message sent: %s', info.messageId);
            await this.addMail({
                sender_name: '系统',
                receiver_code: mailData.user_code,
                receiver_name: mailData.user_name,
                content: mailContent,
                type: mailType.REPAIRE,
                asset_code: mailData.asset_code,
                asset_name: mailData.asset_name,
            });
        }

        // 发送超期提醒邮件
        async sendUrgeMail(mailData) {
            const { ctx } = this;
            // send mail with defined transport object
            const mailType = ctx.constants.MAIL_TYPE;
            const mailContent =
            `您好，您借用的仪器已经超期，请及时归还，仪器信息如下：
                仪器编码：${mailData.asset_code}， 
                仪器名称：${mailData.name}，
                借用时间：${mailData.time_lend}`;
            const info = await transporter.sendMail({
                from: `"智能柜管理系统" ${app.config.mail.from}`, // sender address
                to: mailData.to, // list of receivers
                subject: '仪器借用超期提醒', // Subject line
                text: mailContent
            });
            console.log('Message sent: %s', info.messageId);
            await this.addMail({
                sender_name: '系统',
                receiver_code: mailData.user_code,
                receiver_name: mailData.user_name,
                content: mailContent,
                type: mailType.REPAIRE,
                asset_code: mailData.asset_code,
                asset_name: mailData.asset_name,
            });
        }

        // 发送验证码邮件
        async sendVerifyCode(container_code, userInfo) {
            const { ctx } = this;
            const verifyCode = Math.floor(Math.random() * 1000000);
            // send mail with defined transport object
            const mailContent =
            `您正在编号为${container_code}的存取柜处进行登录操作, 验证码为:${verifyCode}, 有效时间5分钟`;
            const info = await transporter.sendMail({
                from: `"智能柜管理系统" ${app.config.mail.from}`, // sender address
                to: userInfo.email, // list of receivers
                subject: '登录验证码', // Subject line
                text: mailContent
            });
            // 存入验证码
            const res = await app.mysql.insert('verifycode', {
                username: userInfo.username,
                cardnum: userInfo.cardnum,
                verifycode: verifyCode,
                send_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                expire_time: moment().add(5, 'm').format('YYYY-MM-DD HH:mm:ss')
            });
        }

    };
};

