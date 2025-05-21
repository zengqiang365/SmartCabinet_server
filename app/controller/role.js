'use strict';

module.exports = app => {
    const BaseController = app._baseController;

    return class roleController extends BaseController {

        // 获取角色列表
        async getRoles(ctx) {
            BaseController.checkParameter(ctx, { required: ['pageNum', 'pageSize'], optional: ['role_name'] });
            BaseController.page(ctx);
            let cond = null;
            if (ctx.data.role_name) {
                cond = { role_name: ctx.data.role_name };
            }
            const roles = await ctx.service.role.getRoleList(ctx.page, cond);
            const roleNum = await ctx.service.role.getCount(ctx.page, cond);
            ctx.body = {
                list: roles,
                totalCount: roleNum.totalNum
            };
        }
        // 获取角色枚举列表
        async getAllRoles(ctx) {
            ctx.body = await ctx.service.role.getAllRoles();
        }
        // 根据id查询
        async findRoleById(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'] });
            console.log(ctx.data.id);
            ctx.body = await ctx.service.role.findRoleById(ctx.data.id);
        }
        // 根据code查询
        async findRoleByCode(ctx) {
            BaseController.checkParameter(ctx, { required: ['role_code'] });
            ctx.body = await ctx.service.role.findRoleByCode(ctx.data.role_code);
        }
        // 增加角色
        async addRole(ctx) {
            BaseController.checkParameter(ctx, { required: ['role_code', 'role_name'], optional: ['asset_grads', 'description'] });
            ctx.body = await ctx.service.role.addRole(ctx.data);
        }
        // 修改角色
        async editRole(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'], optional: ['role_code', 'permits', 'asset_grads', 'role_name', 'description'] });
            ctx.body = await ctx.service.role.editRole(ctx.data);
        }

        // 修改权限
        async editPermits(ctx) {
            BaseController.checkParameter(ctx, { required: ['role_code', 'permits'] });
            ctx.body = await ctx.service.role.editPermits(ctx.data);
        }

        // 删除角色
        async deleteRoles(ctx) {
            BaseController.checkParameter(ctx, { required: ['ids'] });
            ctx.body = await ctx.service.role.deleteRoles(ctx.data.ids);
        }
    };
};
