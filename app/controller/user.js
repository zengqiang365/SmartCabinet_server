'use strict';
module.exports = app => {

    const BaseController = app._baseController;

    return class userController extends BaseController {
        // 登录
        async login(ctx) {
            BaseController.checkParameter(ctx, { required: ['username', 'password'] });
            const userInfo = await ctx.service.user.findUser({ username: ctx.data.username, password: ctx.data.password });

            if (!userInfo) {
                return ctx.helper.throwBusinessError('用户名或密码错误');
            }

            const result = await this.sign(ctx, userInfo);
            return ctx.body = result;
        }

        // 登出
        async logout(ctx) {
            await app.redis.del(ctx.userInfo.username);
            // ctx.helper.deleteUserToken(ctx.userInfo);
            ctx.body = '退出成功';
        }

        // 按卡号登录
        async cardLogin(ctx) {
            BaseController.checkParameter(ctx, { required: ['cardnum', 'container_code'] });
            const userInfo = await ctx.service.user.findUserByCard({ cardnum: ctx.data.cardnum });

            if (!userInfo) {
                return ctx.helper.throwBusinessError('无法识别的卡');
            }
            const result = await ctx.service.ews.sendVerifyCode(ctx.data.container_code, userInfo);
            return ctx.body = userInfo;
        }

        // 校验验证码
        async checkVerifyCode(ctx) {
            BaseController.checkParameter(ctx, { required: ['cardnum', 'verify_code'] });
            const result = await ctx.service.user.checkVerifyCode(ctx.data);
            if (!result) {
                return ctx.helper.throwBusinessError('验证码错误');
            }
            const userInfo = await ctx.service.user.findUserByCard({ cardnum: ctx.data.cardnum });
            if (!userInfo) {
                return ctx.helper.throwBusinessError('无法识别的卡');
            }
            const loginResult = await this.sign(ctx, userInfo);
            return ctx.body = loginResult;
        }

        // 生成token
        async sign(ctx, userInfo) {
            const userToken = {
                id: userInfo.id,
                username: userInfo.username,
                user_code: userInfo.code,
                role: userInfo.role_code,
                name: userInfo.name
            };

            const token = await ctx.service.user.sign(userToken);

            const result = {
                token,
                id: userInfo.id,
                name: userInfo.name,
                username: userInfo.username,
                user_code: userInfo.code,
                role: userInfo.role_code,
                org_code: userInfo.org_code,
                permits: [],
                asset_grads: [],
            };

            if (userInfo.permits && userInfo.permits.length > 0) {
                // 加入用户页面权限
                // result.permits = userInfo.permits.split(',');
                result.permits = ctx.helper.encodeStr(userInfo.permits);
            }
            if (userInfo.asset_grads && userInfo.asset_grads.length > 0) {
                // 加入用户可操作设备等级权限
                result.asset_grads = userInfo.asset_grads.split(',');
            }
            await app.redis.set(result.username, result.token);
            // ctx.helper.addToken(result);
            return result;
        }

        // 获取用户列表
        async getUsers(ctx) {
            BaseController.checkParameter(ctx, { required: ['pageNum', 'pageSize'], optional: ['name'] });
            BaseController.page(ctx);
            let cond = null;
            if (ctx.data.name) {
                cond = { name: ctx.data.name };
            }
            const userInfos = await ctx.service.user.getUserList(ctx.page, cond);
            const userNum = await ctx.service.user.getCount(ctx.page, cond);
            ctx.body = {
                list: userInfos,
                totalCount: userNum.totalNum
            };
        }
        // 按id查询用户
        async findUserById(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'] });
            ctx.body = await ctx.service.user.findUserById(ctx.data.id);
        }
        // 增加用户
        async addUser(ctx) {
            BaseController.checkParameter(ctx, { required: ['name', 'username', 'email'], optional: ['code', 'cardnum', 'role_code', 'org_code', 'reserve_enable'] });
            ctx.body = await ctx.service.user.addUser(ctx.data);
        }
        // 修改用户
        async editUser(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'], optional: ['name', 'email', 'cardnum', 'username', 'code', 'role_code', 'org_code', 'reserve_enable'] });
            ctx.body = await ctx.service.user.editUser(ctx.data);
        }

        // 修改密码
        async modifyPassword(ctx) {
            BaseController.checkParameter(ctx, { required: ['old', 'new'] });
            const result = await ctx.service.user.modifyPassword(ctx.userInfo, ctx.data);
            if (result) {
                return ctx.body = result;
            }
            return ctx.helper.throwBusinessError('原密码错误');
        }

        // 删除用户
        async deleteUsers(ctx) {
            BaseController.checkParameter(ctx, { required: ['ids'] });
            ctx.body = await ctx.service.user.deleteUsers(ctx.data.ids);
        }

        async getUserOrgInfo(ctx) {
            const orgInfo = await ctx.service.user.getUserOrgInfo(ctx.userInfo.id);
            const limit = await ctx.service.limit.findALimit({ code: 'reserve_advance' });
            orgInfo.limit_ra = limit.limit;
            ctx.body = orgInfo;
        }

    };
};
