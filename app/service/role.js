/**
 * Created by sunzq on 2022/09/13
 */
const _ =  require('lodash');
const moment = require('moment');
module.exports = app => {
    const Service = require('egg').Service;
    return class roleService extends Service {

        // 获取角色列表
        async getRoleList(pageObj, cond) {

            let sql = 'select * from role';
            const values = [];
            if (cond && cond.role_name) {
                sql += ' where role_name like ?';
                values.push(`%${cond.role_name}%`);
            }
            sql += ` limit ${pageObj.skip},${pageObj.limit}`;
            const roleInfo = await app.mysql.query(sql, values.length > 0 ? values : null);
            if (!roleInfo) {
                return null;
            }
            return roleInfo;
        }
        // 获取角色总数
        async getCount(pageObj, cond) {
            const totalNum = await app.mysql.count('role', cond);
            const totalPage = Math.ceil(totalNum / pageObj.pageSize);
            return { totalNum, totalPage };
        }

        // 获取角色列表
        async getAllRoles() {
            const roleInfo = await app.mysql.select('role', {
                columns: ['role_code', 'role_name'],
            });

            if (!roleInfo) {
                return null;
            }
            return roleInfo;
        }

        // 按id查找角色
        async findRoleById(id) {
            const result = await app.mysql.get('role', { id });
            return result;
        }
        // 按code查找角色
        async findRoleByCode(role_code) {
            const result = await app.mysql.get('role', { role_code });
            return result;
        }
        // 增加角色
        async addRole(roleData) {
            if (roleData.asset_grads == '') {
                roleData.asset_grads = null;
            }
            const result = await app.mysql.insert('role', roleData);
            return result;
        }
        // 修改角色
        async editRole(roleData) {
            if (roleData.asset_grads == '') {
                roleData.asset_grads = null;
            }
            const role = await app.mysql.get('role', { id: roleData.id });
            if (['0', '1', '2', '3', '4', '5', '6'].includes(role.role_code) && (role.role_code != roleData.role_code || role.role_name != roleData.role_name)) {
                return this.ctx.helper.throwBusinessError('您无法修改系统预置角色编码或名称，如需修改，请联系管理员');
            }
            const result = await app.mysql.update('role', roleData);
            return result;
        }
        // 修改角色权限
        async editPermits(roleData) {
            const result = await app.mysql.query('update role set permits = ? where role_code= ? ', [roleData.permits, roleData.role_code]);
            await this.getRolePermits(roleData.role_code);
            return result;
        }
        // 删除角色
        async deleteRoles(ids) {
            const roles = await app.mysql.get('role', { where: { id: ids } });
            const role_code = roles[0].role_code;
            if (['0', '1', '2', '3', '4', '5', '6'].includes(role_code)) {
                return this.ctx.helper.throwBusinessError('您无法删除系统预置角色，如需修改，请联系管理员');
            }
            const result = await app.mysql.delete('role', { id: ids });
            return result;
        }

        // 获取角色权限
        async getRolePermits(role_code) {
            let roles = null;
            if (role_code) {
                roles = await app.mysql.query('select role_code, permits from role where role_code=?', [role_code]);
            } else {
                roles = await app.mysql.query('select role_code, permits from role');
            }
            if (roles && roles.length > 0) {
                for (let i = 0; i < roles.length; i++) {
                    const role = roles[i];
                    if (role.permits.length > 0) {
                        const permits = await app.mysql.query(`select url from permits where permit in (0,${role.permits})`);
                        const ps = new Set();
                        permits.forEach(permit => {
                            ps.add(permit.url);
                        });
                        app.rolePermits.set(role.role_code, ps);
                    }
                }
            }
        }

    };
};

