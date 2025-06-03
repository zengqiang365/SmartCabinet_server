/**
 * Created by sunzq on 2019/05/28
 */
const _ =  require('lodash');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
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
            const sql = 'select a.*, b.permits from user a left join role b on a.role_code=b.role_code where a.username = ? and a.password = ?';
            const userInfo = await app.mysql.query(sql, [cond.username, cond.password]);
            if (!userInfo) {
                return null;
            }
            return userInfo[0];
        }
        // 按照卡号查找用户
        async findUserByCard(cond) {
            const sql = 'select a.*, b.permits from user a left join role b on a.role_code=b.role_code where a.cardnum = ?';
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

        async checkImage(cond) {
            const sql = 'select * from userface where user_code= ? order by id desc limit 1';
            const faceInfos = await app.mysql.query(sql, [cond.user_code]);
            if (!faceInfos || faceInfos.length == 0) {
                return false;
            }
            const faceInfo = faceInfos[0];
            const image = cond.image;
            const imageDesc = await this.ctx.service.face.getBufDescriptor(image); // 获取人脸特征值
            const myDesc = JSON.parse(faceInfo.face_desc);
            const distance = await this.ctx.service.face.faceCompare(imageDesc, myDesc); // 获取人脸特征值
            console.log(distance);
            if (distance > 0.4) {
                // 人脸比对失败
                return false;
            }
            const userSql = 'select a.*, b.permits from user a left join role b on a.role_code=b.role_code where a.code = ?';
            const userInfo = await app.mysql.query(userSql, [cond.user_code]);
            return userInfo[0];
        }

        // 获取用户的列表
        async getUserList(pageObj, cond) {
            let userSql = 'select id, code, name, photo, username, cardnum, email, role_code, org_code, reserve_enable from user where';
            const orgSql = 'select id, org_code, org_name from organization';
            // let sql = 'select a.id, a.code, a.name, a.username, a.cardnum, a.email, a.role_code, a.org_code, b.org_name from user a left join organization b on a.org_code = b.org_code';
            const values = [];
            if (cond && cond.name) {
                userSql += ' name like ? and';
                values.push(`%${cond.name}%`);
            }
            if (cond && cond.org_code) {
                userSql += ' org_code like ? and';
                values.push(`${cond.org_code}%`);
            }
            userSql += ` 1=1 limit ${pageObj.skip},${pageObj.limit}`;

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
            let sql = 'select count(*) as totalnum from user where';
            const values = [];
            if (cond && cond.name) {
                sql += ' name like ? and';
                values.push(`%${cond.name}%`);
            }
            if (cond && cond.org_code) {
                sql += ' org_code like ? and';
                values.push(`${cond.org_code}%`);
            }
            sql += ' 1=1';
            const num = await app.mysql.query(sql, values.length > 0 ? values : null);
            const totalNum = num[0].totalnum;
            const totalPage = Math.ceil(totalNum / pageObj.pageSize);
            return { totalNum, totalPage };
        }

        // 获取用户的列表
        async getOrgUsers(cond) {
            let userSql = 'select id, code, name, org_code from user';
            const values = [];
            if (cond && cond.org_code) {
                userSql += ' where org_code like ?';
                values.push(`${cond.org_code}%`);
            }
            const userInfo = await app.mysql.query(userSql, values.length > 0 ? values : null);
            return userInfo;
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
            if (userData.photo) {
                await app.mysql.query('update userface set user_code=? where photo=?', [userData.code, userData.photo]);
            }
            return result;
        }
        // 修改用户
        async editUser(userData) {
            const result = await app.mysql.update('user', userData);
            if (userData.photo) {
                await app.mysql.query('update userface set user_code=? where photo=?', [userData.code, userData.photo]);
            }
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

        // 上传设备图片
        async uploadPhoto(data) {
            const { ctx } = this;
            if (!(ctx.request.files && ctx.request.files.length > 0)) { // 如果未收到文件，返回错误
                return false;
            }
            const mpFile = ctx.request.files[0];
            const tmpFilePath = mpFile.filepath; // 获取文件路径

            const fileName = path.basename(tmpFilePath);
            // const fileName = this.formatFilePath(data.fileName);
            // 生成路径名
            const toFileName = '/public/img/photo/' + fileName;
            const to = path.join(__dirname, `../public/img/photo/${fileName}`);
            const desc = await this.ctx.service.face.getDescriptor(tmpFilePath); // 获取人脸特征值

            // await app.mysql.insert('userface', { photo: toFileName, face_desc: desc, upload_time: moment().format('YYYY-MM-DD HH:mm:ss') });
            await app.mysql.query(`INSERT INTO userface(photo, face_desc, upload_time) values('${toFileName}', JSON_ARRAY(${desc}), '${moment().format('YYYY-MM-DD HH:mm:ss')}')`);
            // 拷贝图片至本地
            await fs.copyFileSync(tmpFilePath, to);

            // 返回前端路径
            return toFileName;
        }

        // 格式化字符串 去除特殊字符
        formatFilePath(filePath) {
            filePath = filePath.replace(/\s*/g, ''); // 去空格
            filePath = filePath.replace(/\(/g, ''); // 去左括号
            filePath = filePath.replace(/\)/g, ''); // 去右括号
            return filePath;
        }


    };
};

