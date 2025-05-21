/**
 * Created by sunzq on 2023/01/28
 */
const _ =  require('lodash');
const moment = require('moment');
const ews = require('exchange-web-service');

module.exports = app => {
    const Service = require('egg').Service;
    ews.config(
        app.config.mail.user,
        app.config.mail.pass,
        app.config.mail.host + '/Ews/Exchange.asmx',
        app.config.mail.domain
    );

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
        // 按id查找邮件
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
            let enErr = null;
            const repaireType = ctx.constants.REPAIR_TYPE;
            const mailType = ctx.constants.MAIL_TYPE;
            switch (mailData.repair) {
            case repaireType.BROKEN:
                err = '设备损坏';
                enErr = 'Equipment damaged';
                break;
            case repaireType.PART_BROKEN:
                err = '配件损坏或遗失';
                enErr = 'Accessories damaged or missing';
                break;
            case repaireType.RFID:
                err = 'RFID标签损坏';
                enErr = 'RFID tag damaged';
                break;
            case repaireType.UNKNOWN:
                err = '未知故障';
                enErr = 'Unknown fault';
                break;
            default:
                err = '无';
                enErr = 'none';
            }
            const asset = await ctx.service.asset.findAssetByCode(mailData.asset_code);
            if (asset && asset.org_code) {
                const admin = await ctx.service.user.getAssetAdmin(asset.org_code);
                if (admin && admin.email) {
                    const container = await app.mysql.get('container', { code: mailData.container_code });
                    const chContent = `您管理的仪器有损坏报修，请及时修理。信息如下： &lt;br&gt;
                    货柜编码：${mailData.container_code}， 
                    货柜位置：${container.address}，
                    格口编码：${mailData.grid_code}，
                    仪器编码：${mailData.asset_code}，
                    仪器名称：${mailData.asset_name}，
                    报修问题：${err}`;
                    const enContent = `The instrument you are managing has a warranty for damage, please repair it promptly. The information is as follows: 
                    Container code: ${mailData.container_code}, 
                    Container location: ${container.address}, 
                    Grid code: ${mailData.grid_code}, 
                    Asset code: ${mailData.asset_code}, 
                    Asset name: ${mailData.asset_name}, 
                    Repair issue: ${enErr}`;
                    const mailContent = chContent + ' &lt;br&gt; ' + enContent;

                    await this.addMail({
                        sender_name: '系统',
                        receiver_code: admin.code,
                        receiver_name: admin.name,
                        content: chContent,
                        type: mailType.REPAIRE,
                        asset_code: mailData.asset_code,
                        asset_name: mailData.asset_name,
                    });
                    // send mail
                    ews.sendMail(admin.email, '仪器报修', mailContent);
                }
            }
        }

        // 发送超期提醒邮件
        async sendUrgeMail(mailData) {
            const { ctx } = this;
            const mailType = ctx.constants.MAIL_TYPE;
            const containerInfo = await app.mysql.get('container', { code: mailData.container_code });
            let address = '';
            if (containerInfo) { address = containerInfo.address; }
            const assetContent = `仪器信息如下： &lt;br&gt;
                货柜位置：${address}，
                仪器编码：${mailData.asset_code}， 
                仪器名称：${mailData.asset_name}，
                借用时间：${mailData.time_lend},
                应还时间：${mailData.expire_time}`;
            const enAssetContent = `The instrument information is as follows:   &lt;br&gt;
            Container location: ${address}, 
            Asset code: ${mailData.asset_code}, 
            Asset name: ${mailData.asset_name}, 
            borrowing time: ${mailData.time_lend}, 
            due date: ${mailData.expire_time}`;

            let mailContent = null;
            let chContent = null;
            let enContent = null;

            const mailLog = {
                sender_name: '系统',
                receiver_code: mailData.user_code,
                receiver_name: mailData.user_name,
                content: null,
                type: mailType.REMIND_TIMEOUT,
                asset_code: mailData.asset_code,
                asset_name: mailData.asset_name,
            };
            const diff = moment().diff(moment(mailData.expire_time), 'days', true);
            const times = await app.mysql.query('select * from limit_time where code like ?', ['lend_timeout%']);
            const time_5 = _.find(times, { code: 'lend_timeout_remind_5' });
            const time_4 = _.find(times, { code: 'lend_timeout_remind_4' });
            const time_3 = _.find(times, { code: 'lend_timeout_remind_3' });
            let adminInfo = null;

            if (Math.floor(diff) == time_3.limit) {
                adminInfo = await ctx.service.user.getAdminOfLevel(mailData.org_code, '3');
                chContent = `您好，您部门内 ${mailData.user_name} 借用的仪器已经超期，` + assetContent;
                enContent = `Hello, the instrument borrowed by ${mailData.user_name} in your department has expired. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
                // 禁止再预约
                await ctx.service.user.forbidReserve(mailData.user_code);
            } else if (Math.floor(diff) == time_4.limit) {
                adminInfo = await ctx.service.user.getAdminOfLevel(mailData.org_code, '4');
                chContent = `您好，您科室内 ${mailData.user_name} 借用的仪器已经超期，` + assetContent;
                enContent = `Hello, the instrument borrowed by ${mailData.user_name} in your department has expired. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (Math.floor(diff) == time_5.limit) {
                adminInfo = await ctx.service.user.getAdminOfLevel(mailData.org_code, '5');
                chContent = `您好，您组内 ${mailData.user_name} 借用的仪器已经超期，` + assetContent;
                enContent = `Hello, the instrument borrowed by ${mailData.user_name} in your group has expired. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (diff > 0 && diff < 1) {
                const myChContent = `您好，${mailData.user_name} 借用的仪器已经超期，` + assetContent;
                const myEnContent = `Hello, the instrument borrowed by ${mailData.user_name} has expired, ` + enAssetContent;
                const myContent = myChContent + '  &lt;br&gt;' + myEnContent;
                mailLog.content = myChContent;
                ews.sendMail(mailData.to, '仪器借用超期提醒', myContent);
                await this.addMail(mailLog);
                chContent = `您好，${mailData.user_name} 借用的仪器已经超期，请提醒${mailData.user_name}及时归还，` + assetContent;
                enContent = `Hello, the instrument borrowed by ${mailData.user_name} has expired. Please remind ${mailData.user_name} to return it in a timely manner. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
                adminInfo = await ctx.service.user.getAssetAdmin(mailData.org_code);
            }
            if (adminInfo) {
                ews.sendMail(adminInfo.email, '仪器借用超期提醒', mailContent);
                mailLog.receiver_code = adminInfo.code;
                mailLog.receiver_name = adminInfo.name;
                mailLog.content = chContent;
                await this.addMail(mailLog);
            }
        }

        async sendRepairOutMail(mailData) {
            const { ctx } = this;
            const mailType = ctx.constants.MAIL_TYPE;
            const containerInfo = await app.mysql.get('container', { code: mailData.container_code });
            let address = '';
            if (containerInfo) { address = containerInfo.address; }
            const assetContent = `仪器信息如下： &lt;br&gt;
                货柜位置：${address}，
                仪器编码：${mailData.asset_code}， 
                仪器名称：${mailData.asset_name}，
                报修时间：${mailData.report_time}`;

            const enAssetContent = `The instrument information is as follows:  &lt;br&gt;
                Container location: ${address}, 
                Asset code: ${mailData.asset_code}, 
                Asset name: ${mailData.asset_name}, 
                report time: ${mailData.report_time}`;

            let mailContent = null;
            let chContent = null;
            let enContent = null;
            const mailLog = {
                sender_name: '系统',
                receiver_code: mailData.user_code,
                receiver_name: mailData.user_name,
                content: null,
                type: mailType.REMIND_TIMEOUT,
                asset_code: mailData.asset_code,
                asset_name: mailData.asset_name,
            };

            if (mailData.level == '6') {
                chContent = '您好，您负责的设备维修已超期，请及时进行设备维修，' + assetContent;
                enContent = 'Hello, the equipment maintenance you are responsible for has exceeded the deadline. Please repair the equipment in a timely manner. ' + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (mailData.level == '5') {
                chContent = `您好，您组内的设备未按时维修，请支持 ${mailData.asset_admin} 推进相关人员进行设备维修，` + assetContent;
                enContent = `Hello, the equipment in your group was not repaired on time. Please support ${mailData.asset_admin} to carry out equipment maintenance.` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (mailData.level == '4') {
                chContent = `您好，您科内 ${mailData.asset_admin} 负责的设备未按时维修，请支持推进相关人员进行设备维修，` + assetContent;
                enContent = `Hello, the equipment responsible for ${mailData.asset_admin} in your department has not been repaired on time. Please support the relevant personnel to carry out equipment maintenance. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (mailData.level == '3') {
                chContent = `您好，您部门内 ${mailData.asset_admin} 负责的设备未按时维修，请支持推进相关人员进行设备维修，` + assetContent;
                enContent = `Hello, the equipment responsible for ${mailData.asset_admin} in your department has not been repaired on time. Please support the relevant personnel to carry out equipment maintenance.` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            }

            mailLog.content = chContent;
            ews.sendMail(mailData.to, '仪器维修超期提醒', mailContent);
            await this.addMail(mailLog);
        }

        // 发送升级提醒邮件
        async sendUpgradeMail(user, assets) {
            const { ctx } = this;
            const mailType = ctx.constants.MAIL_TYPE;
            let chContent =
             `您好，您的科室有仪器维保标定时间即将到期，请及时进行升级，仪器信息如下： &lt;br&gt;
             `;
            let enContent = 'Hello, your department has instruments\'s maintenance calibration time that is about to expire. Please upgrade it in a timely manner. The instrument information is as follows:  &lt;br&gt;';
            let asset_codes = '';
            let asset_names = '';
            assets.forEach(function(a) {
                chContent += `仪器编码：${a.asset_code}, 仪器名称：${a.name}，计划维保标定时间：${moment(a.upgrade_time).format('YYYY-MM-DD')}
                `;
                enContent += `Asset code: ${a.asset_code}, Asset name: ${a.name}, Planned maintenance time: ${moment(a.upgrade_time).format('YYYY-MM-DD')}`;
                asset_codes += a.asset_code + ',';
                asset_names += a.name + ',';
            });
            const mailContent = chContent + '  &lt;br&gt;' + enContent;
            ews.sendMail(user.email, '仪器维保到期提醒', mailContent);
            await this.addMail({
                sender_name: '系统',
                receiver_code: user.code,
                receiver_name: user.name,
                content: chContent,
                asset_code: _.trimEnd(asset_codes, ','),
                asset_name: _.trimEnd(asset_names, ','),
                type: mailType.UPGRADE
            });
        }

        // 发送维保提醒给经理
        async sendNotUpgradeMail(mailData) {
            const { ctx } = this;
            const mailType = ctx.constants.MAIL_TYPE;
            const containerInfo = await app.mysql.get('container', { code: mailData.container_code });
            let address = '';
            if (containerInfo) { address = containerInfo.address; }
            const assetContent = `仪器信息如下： &lt;br&gt;
                货柜位置：${address}，
                仪器编码：${mailData.asset_code}， 
                仪器名称：${mailData.asset_name}，
                计划维保标定时间：${mailData.upgrade_time}`;

            const enAssetContent = `The instrument information is as follows:  &lt;br&gt;
                Container location: ${address}, 
                Asset code: ${mailData.asset_code}, 
                Asset name: ${mailData.asset_name}, 
                Planned maintenance time: ${mailData.upgrade_time}`;
            let mailContent = null;
            let chContent = null;
            let enContent = null;

            const mailLog = {
                sender_name: '系统',
                receiver_code: mailData.user_code,
                receiver_name: mailData.user_name,
                content: null,
                type: mailType.REMIND_TIMEOUT,
                asset_code: mailData.asset_code,
                asset_name: mailData.asset_name,
            };

            if (mailData.level == '6') {
                chContent = '您好，您的科室有仪器维保标定时间已经到期，请及时进行升级，' + assetContent;
                enContent = 'Hello, your department has an instrument maintenance calibration time that has expired. Please upgrade it in a timely manner. ' + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (mailData.level == '5') {
                chContent = `您好，您组内的仪器未按时进行维保标定升级，请支持 ${mailData.asset_admin} 推进仪器的维保标定升级，` + assetContent;
                enContent = `Hello, the instrument in your group was not undergo maintenance calibration upgrade on time. Please support ${mailData.asset_admin} to promote the maintenance calibration upgrade for the instrument. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (mailData.level == '4') {
                chContent = `您好，您科内 ${mailData.asset_admin} 负责的仪器未按时进行维保标定升级，请支持推进仪器的维保标定升级，` + assetContent;
                enContent = `Hello, the instrument under the responsibility of ${mailData.asset_admin} in your department did not undergo maintenance calibration upgrade on time. Please support the promotion of maintenance calibration upgrade for the instrument. ` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            } else if (mailData.level == '3') {
                chContent = `您好，您部门内 ${mailData.asset_admin} 负责的仪器未按时进行维保标定升级，请支持推进仪器的维保标定升级，` + assetContent;
                enContent = `Hello, the instrument under the responsibility of ${mailData.asset_admin} in your department did not undergo maintenance calibration upgrade on time. Please support the promotion of maintenance calibration upgrade for the instrument.` + enAssetContent;
                mailContent = chContent + '  &lt;br&gt;' + enContent;
            }

            mailLog.content = chContent;
            ews.sendMail(mailData.to, '仪器维保标定过期提醒', mailContent);
            await this.addMail(mailLog);
        }

        // 发送登录验证码邮件
        async sendVerifyCode(container_code, userInfo) {
            const { ctx } = this;
            const verifyCode = Math.floor(Math.random() * 1000000);
            // send mail with defined transport object
            const chContent = `您正在编号为${container_code}的存取柜处进行登录操作, 验证码为:${verifyCode}, 有效时间5分钟`;
            const enContent = `You are logging in at the access cabinet with ID ${container_code}, verification code: ${verifyCode}, valid for 5 minutes`;
            const mailContent = chContent + ' &lt;br&gt; ' + enContent;

            // 存入验证码
            const res = await app.mysql.insert('verifycode', {
                username: userInfo.username,
                cardnum: userInfo.cardnum,
                verifycode: verifyCode,
                send_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                expire_time: moment().add(5, 'm').format('YYYY-MM-DD HH:mm:ss')
            });
            ews.sendMail(userInfo.email, '登录验证码', mailContent);
        }

        // 发送预约码邮件
        async sendReserveCode(assetInfo, userInfo, reserveInfo) {
            const { ctx } = this;
            // send mail with defined transport object
            const enContent = `Your pickup verification code is: ${reserveInfo.reserve_code}, device name: ${assetInfo.name}, device ID: ${assetInfo.id}, device code: ${assetInfo.asset_code}, and the device is located in the ${assetInfo.container_name} NO. ${assetInfo.grid_code} grid. The usage time is from ${reserveInfo.reserve_time} to ${reserveInfo.return_time}`;
            const chContent = `您的取件验证码为：${reserveInfo.reserve_code}，预约设备名称：${assetInfo.name}、设备ID:${assetInfo.id}、设备编码:${assetInfo.asset_code}，设备位于${assetInfo.container_name} ${assetInfo.grid_code}号格，使用时间为${reserveInfo.reserve_time} 到 ${reserveInfo.return_time}`;
            const mailContent = chContent + ' &lt;br&gt; ' + enContent;
            ews.sendMail(userInfo.email, '取件验证码', mailContent);
        }

    };
};

