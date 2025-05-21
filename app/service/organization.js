/**
 * Created by sunzq on 2022/09/13
 */
const _ =  require('lodash');
const moment = require('moment');
module.exports = app => {
    const Service = require('egg').Service;
    return class organizationService extends Service {

        // 获取组织列表
        async getOrgList(pageObj, cond) {
            const orgInfo = await app.mysql.select('organization', {
                where: cond,
                limit: pageObj.limit,
                offset: pageObj.skip
            });
            if (!orgInfo) {
                return null;
            }
            return orgInfo;
        }
        // 获取组织总数
        async getCount(pageObj, cond) {
            const totalNum = await app.mysql.count('organization', cond);
            const totalPage = Math.ceil(totalNum / pageObj.pageSize);
            return { totalNum, totalPage };
        }

        // 获取组织树
        async getOrgTree() {
            const orgInfo = await app.mysql.select('organization');
            if (!orgInfo) {
                return null;
            }
            const nodeList = [];
            orgInfo.forEach(function(item) {
                const node = {
                    id: item.id,
                    code: item.org_code,
                    label: item.org_name,
                    pid: item.parentid,
                    children: []
                };
                nodeList.push(node);
            });
            const orgTrees = this.buildTree(nodeList);
            if (orgTrees && orgTrees.length > 0) {
                // console.log(JSON.stringify(orgTrees));
                return orgTrees[0];
            }
            return null;
        }


        // 获取级联组织列表
        async getOrgCascader() {
            const orgInfo = await app.mysql.select('organization');
            if (!orgInfo) {
                return null;
            }
            const nodeList = [];
            orgInfo.forEach(function(item) {
                const node = {
                    value: item.org_code,
                    label: item.org_name,
                    id: item.id,
                    pid: item.parentid,
                    children: []
                };
                nodeList.push(node);
            });
            const orgCascader = this.buildTree(nodeList);
            if (orgCascader && orgCascader.length > 0) {
                return orgCascader;
            }
            return null;
        }
        // 构建树
        buildTree(nodelist) {
            const rootNodes = _.remove(nodelist, { pid: null });
            rootNodes.forEach(item => {
                this.findChild(item, nodelist);
            });
            return rootNodes;
        }
        // 递归查找叶子
        findChild(node, nodelist) {
            if (!nodelist) {
                return;
            }
            node.children = _.remove(nodelist, { pid: node.id });
            node.children.forEach(item => {
                this.findChild(item, nodelist);
            });
        }

        // 按id查找组织
        async findOrgById(id) {
            const result = await app.mysql.get('organization', { id });
            return result;
        }
        // 增加组织
        async addOrg(orgData) {
            const result = await app.mysql.insert('organization', orgData);
            return result;
        }
        // 修改组织
        async editOrg(orgData) {
            const result = await app.mysql.update('organization', orgData);
            return result;
        }
        // 删除组织
        async deleteOrgs(ids) {
            const result = await app.mysql.delete('organization', { id: ids });
            return result;
        }

        async getDepOrgName(org_code) {
            const orgSql = 'select id, org_code, org_name from organization';
            // 获取组织机构信息
            const orgInfo = await app.mysql.query(orgSql);
            const orgMap = new Map();
            orgInfo.forEach(function(item) {
                orgMap.set(item.org_code, item.org_name);
            });
            const depOrg = {
                org_code: '',
                org_name: '',
                dep_code: '',
                dep_name: '',
                group_code: '',
                group_name: ''
            };
            const orgs = org_code.split('-');
            if (orgs.length === 3) {
                // 部门编码和名称
                depOrg.org_code = orgs[0] + '-' + orgs[1];
                depOrg.org_name = orgMap.get(depOrg.org_code);
                // 科室编码和名称
                depOrg.dep_code = orgs[0] + '-' + orgs[1] + '-' + orgs[2];
                depOrg.dep_name = orgMap.get(depOrg.dep_code);
            } else if (orgs.length === 4) {
                // 部门编码和名称
                depOrg.org_code = orgs[0] + '-' + orgs[1];
                depOrg.org_name = orgMap.get(depOrg.org_code);
                // 科室编码和名称
                depOrg.dep_code = orgs[0] + '-' + orgs[1] + '-' + orgs[2];
                depOrg.dep_name = orgMap.get(depOrg.dep_code);
                // 组编码和名称
                depOrg.group_code = orgs[0] + '-' + orgs[1] + '-' + orgs[2] + '-' + orgs[3];
                depOrg.group_name = orgMap.get(depOrg.group_code);
            } else {
                depOrg.org_code = org_code;
                depOrg.org_name = orgMap.get(org_code);
            }
            return depOrg;
        }

        async getAllOrgs() {
            const orgSql = 'select id, org_code, org_name from organization';
            const orgInfo = await app.mysql.query(orgSql);
            return orgInfo;
        }

    };
};

