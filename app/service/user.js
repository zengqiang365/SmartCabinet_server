/**
 * Created by sunzq on 2019/05/28
 */
const _ =  require('lodash');
const moment = require('moment');
module.exports = app => {
    const Service = require('egg').Service;
    return class userService extends Service {

        /**
         * 生成token
         * @param {Object} data 生成token的数据
         * @return 生成的token
         */
        async sign(data) {
            const { ctx: { app: { jwt, config } } } = this;
            return jwt.sign(data, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
        }

        // 查找用户
        async findUser(cond) {
            const sql = 'select a.*, b.permits, b.asset_grads from user a left join role b on a.role_code=b.role_code where a.username = ? and a.password = ?';
            const userInfo = await app.mysql.query(sql, [cond.username, cond.password]);
            if (!userInfo) {
                return null;
            }
            return userInfo[0];
        }
        // 按照卡号查找用户
        async findUserByCard(cond) {
            const sql = 'select a.*, b.permits, b.asset_grads from user a left join role b on a.role_code=b.role_code where a.cardnum = ?';
            const userInfo = await app.mysql.query(sql, [cond.cardnum]);
            if (!userInfo) {
                return null;
            }
            return userInfo[0];
        }

        // 校验验证码
        async checkVerifyCode(cond) {
            const sql = 'select * from verifycode where cardnum= ? and verifycode= ? and ' +
            `expire_time>'${moment().format('YYYY-MM-DD HH:mm:ss')}'`;
            const result = await app.mysql.query(sql, [cond.cardnum, cond.verify_code]);
            if (!result || result.length == 0) {
                return false;
            }
            return true;
        }

        // 获取用户的列表
        async getUserList(pageObj, cond) {
            let userSql = 'select id, code, name, username, cardnum, email, role_code, org_code, reserve_enable from user';
            const orgSql = 'select id, org_code, org_name from organization';
            // let sql = 'select a.id, a.code, a.name, a.username, a.cardnum, a.email, a.role_code, a.org_code, b.org_name from user a left join organization b on a.org_code = b.org_code';
            const values = [];
            if (cond && cond.name) {
                userSql += ' where name like ?';
                values.push(`%${cond.name}%`);
            }
            userSql += ` limit ${pageObj.skip},${pageObj.limit}`;

            const userInfo = await app.mysql.query(userSql, values.length > 0 ? values : null);

            if (!userInfo) {
                return null;
            }
            // 获取组织机构信息
            const orgInfo = await app.mysql.query(orgSql);
            const orgMap = new Map();
            orgInfo.forEach(function(item) {
                orgMap.set(item.org_code, item.org_name);
            });
            userInfo.forEach(function(user) {
                if (user.org_code && user.org_code.length > 0) {
                    const orgs = user.org_code.split('-');
                    if (orgs.length === 3) {
                        user.org_name = orgMap.get(orgs[0] + '-' + orgs[1]);
                        user.dep_name = orgMap.get(orgs[0] + '-' + orgs[1] + '-' + orgs[2]);
                    } else if (orgs.length === 4) {
                        user.org_name = orgMap.get(orgs[0] + '-' + orgs[1]);
                        user.dep_name = orgMap.get(orgs[0] + '-' + orgs[1] + '-' + orgs[2]);
                        user.group_name = orgMap.get(orgs[0] + '-' + orgs[1] + '-' + orgs[2] + '-' + orgs[3]);
                    } else {
                        user.org_name = orgMap.get(user.org_code);
                    }
                }
            });
            return userInfo;
        }
        // 获取用户总数
        async getCount(pageObj, cond) {
            const totalNum = await app.mysql.count('user', cond);
            const totalPage = Math.ceil(totalNum / pageObj.pageSize);
            return { totalNum, totalPage };
        }
        // 按id查找用户
        async findUserById(id) {
            const result = await app.mysql.get('user', { id });
            return result;
        }
        // 按code查找用户
        async findUserByCodes(code) {
            let codes = [];
            if (Array.isArray(code)) {
                codes = code;
            } else {
                codes.push(code);
            }
            let codeStr = '';
            for (const c of codes) {
                codeStr += `'${c}',`;
            }
            codeStr = codeStr.slice(0, codeStr.length - 1);
            const sql = `select * from user where code in (${codeStr})`;
            const users = await app.mysql.query(sql);
            return users;
        }
        // 增加用户
        async addUser(userData) {
            const result = await app.mysql.insert('user', userData);
            return result;
        }
        // 修改用户
        async editUser(userData) {
            const result = await app.mysql.update('user', userData);
            return result;
        }
        // 删除用户
        async deleteUsers(ids) {
            const result = await app.mysql.delete('user', { id: ids });
            return result;
        }
        // 修改密码
        async modifyPassword(userInfo, passwordData) {
            const user = await app.mysql.get('user', { id: userInfo.id, password: passwordData.old });
            if (user) {
                return await app.mysql.update('user', { id: userInfo.id, password: passwordData.new });
            }
            return null;
        }

        // 获取组织的管理员
        async getAdminOfOrg(org_code) {
            const adminType = this.ctx.constants.ADMIN_TYPE;
            let role = null;
            const orgs = org_code.split('-');
            if (orgs.length == 1) { // 二级，中心管理员
                role = adminType.LEVEL2;
            } else if (orgs.length == 2) {
                role = adminType.ORG;
            } else if (orgs.length == 3) {
                role = adminType.DEP;
            } else {
                role = adminType.GROUP;
            }
            const user = await app.mysql.get('user', { org_code, role_code: role });
            return user;
        }

        // 获取组织机构下不同等级的管理员/领导
        async getAdminOfLevel(org_code, level) {
            const adminType = this.ctx.constants.ADMIN_TYPE;
            const orgs = org_code.split('-').concat('', '', '');
            let org = null;
            const role_code = level;

            if (role_code == adminType.GROUP) {
                org = orgs[0] + '-' +  orgs[1] + '-' + orgs[2] + '-' + orgs[3];
            } else if (role_code == adminType.DEP) {
                org = orgs[0] + '-' + orgs[1] + '-' + orgs[2];
            } else if (role_code == adminType.ORG) {
                org = orgs[0] + '-' + orgs[1];
            }

            const user = await app.mysql.get('user', { org_code: org, role_code });
            return user;
        }

        // 获取一个人的科室管理员
        async getAssetAdmin(org_code) {
            const adminType = this.ctx.constants.ADMIN_TYPE;
            const role_code = adminType.ASSET;
            const orgs = org_code.split('-').concat('', '', '');
            const org = orgs[0] + '-' + orgs[1] + '-' + orgs[2] + '%';
            let user = null;

            const users = await app.mysql.query('select * from user where org_code like ? and role_code= ?', [org, role_code]);
            if (users && users.length > 0) {
                user = users[0];
            }
            return user;
        }

        // 查询该用户的组织机构信息
        async getUserOrgInfo(id) {
            const user = await app.mysql.get('user', { id });
            const orgInfo = await this.ctx.service.organization.getDepOrgName(user.org_code);
            return orgInfo;
        }

        // 禁止预约
        async forbidReserve(code) {
            await app.mysql.query('update user set reserve_enable = ? where code = ?', ['0', code]);
        }

    };
};

