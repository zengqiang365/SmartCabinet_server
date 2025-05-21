'use strict';

module.exports = app => {
    const BaseController = app._baseController;

    return class organizationController extends BaseController {

        // 获取组织列表
        async getOrgs(ctx) {
            BaseController.checkParameter(ctx, { required: ['pageNum', 'pageSize'], optional: ['org_code'] });
            BaseController.page(ctx);
            let cond = null;
            if (ctx.data.org_code) {
                cond = { name: ctx.data.org_code };
            }
            const orgs = await ctx.service.organization.getOrgList(ctx.page, cond);
            const orgNum = await ctx.service.organization.getCount(ctx.page, cond);
            ctx.body = {
                list: orgs,
                totalCount: orgNum.totalNum
            };
        }
        // 获取组织树
        async getOrgTree(ctx) {
            const orgs = await ctx.service.organization.getOrgTree();
            ctx.body = orgs;
        }
        // 获取组织树（用作其他列表选择用）
        async getOrgCascader(ctx) {
            const orgs = await ctx.service.organization.getOrgCascader();
            ctx.body = orgs;
        }
        // 保存组织树
        async saveOrgTree(ctx) {
            BaseController.checkParameter(ctx, { required: ['orgTree'] });
            // const orgs = await ctx.service.organization.OrgTree();
            const orgTree = ctx.data.orgTree;
            console.log(orgTree);
            ctx.body = true;
        }
        // 按id查询组织信息
        async findOrgById(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'] });
            console.log(ctx.data.id);
            ctx.body = await ctx.service.organization.findOrgById(ctx.data.id);
        }
        // 增加组织
        async addOrg(ctx) {
            BaseController.checkParameter(ctx, { required: ['org_code', 'org_name'], optional: ['org_name_en'] });
            ctx.body = await ctx.service.organization.addOrg(ctx.data);
        }
        // 修改组织
        async editOrg(ctx) {
            BaseController.checkParameter(ctx, { required: ['id'], optional: ['org_code', 'org_name', 'org_name_en'] });
            ctx.body = await ctx.service.organization.editOrg(ctx.data);
        }

        // 删除组织
        async deleteOrgs(ctx) {
            BaseController.checkParameter(ctx, { required: ['ids'] });
            ctx.body = await ctx.service.organization.deleteOrgs(ctx.data.ids);
        }
        // 获取所有机构信息
        async allOrgs(ctx) {
            ctx.body = await ctx.service.organization.getAllOrgs();
        }
    };
};
