'use strict';

module.exports = app => {
    const BaseController = app._baseController;

    return class mailController extends BaseController {

        // 获取邮件列表
        async getMails(ctx) {
            BaseController.checkParameter(ctx, { required: ['pageNum', 'pageSize'], optional: ['receiver_name'] });
            BaseController.page(ctx);
            let cond = null;
            if (ctx.data.receiver_name) {
                cond = { receiver_name: ctx.data.receiver_name };
            }
            const mails = await ctx.service.ews.getMailList(ctx.page, cond);
            const mailNum = await ctx.service.ews.getCount(ctx.page, cond);
            ctx.body = {
                list: mails,
                totalCount: mailNum.totalNum
            };
        }
        // 按id查找邮件
        async findMailById(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'] });
            console.log(ctx.data.id);
            ctx.body = await ctx.service.ews.findMailById(ctx.data.id);
        }
        // 增加邮件
        async addMail(ctx) {
            BaseController.checkParameter(ctx, { required: ['sender_code', 'receiver_code', 'sender_name', 'receiver_name', 'content'], optional: ['type', 'operate_id'] });
            ctx.body = await ctx.service.ews.addMail(ctx.data);
        }
        // 修改邮件
        async editMail(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'], optional: ['sender_code', 'receiver_code', 'sender_name', 'receiver_name', 'content', 'type', 'operate_id'] });
            ctx.body = await ctx.service.ews.editMail(ctx.data);
        }

    };
};
