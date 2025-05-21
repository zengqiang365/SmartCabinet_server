const constantsObj = Object.freeze({

    // 存储柜类型
    CONTAINER_TYPE: Object.freeze({
        GRID63: '0', // 63格
        GRID64: '1', // 64格
    }),
    // 存储柜状态
    CONTAINER_STATUS: Object.freeze({
        BROKEN: '-1', // 故障
        UNLINK: '0', // 未连接
        NORMAL: '1', // 正常
    }),
    // 存储格开闭状态
    GRID_OPEN: Object.freeze({
        UNKNOWN: '-1', // 未知
        CLOSED: '0', // 关闭
        OPEN: '1', // 打开
    }),
    // 存储格是否空状态
    GRID_EMPTY: Object.freeze({
        UNKNOWN: '-1', // 未知
        EMPTY: '0', // 空的
        STORE: '1', // 非空
    }),
    // 仪器类型
    ASSET_TYPE: Object.freeze({
        OSCILLO: '1', // 示波器
        VOLT: '2', // 电压表
    }),
    // 仪器状态
    ASSET_STATUS: Object.freeze({
        BROKEN: '-1', // 故障
        UNKNOWN: '0', // 未知状态
        NORMAL: '1', // 正常
        LEND: '2', // 借出
        STOREERROR: '3', // 存储错误
        ORDER: '4', // 已预约
        REPAIR: '5', // 修理中
        NEEDUPGRADE: '6', // 需要维保标定
        UPGRADE: '7', // 维保标定中
    }),
    // 操作类型
    OPERATE_TYPE: Object.freeze({
        TAKE: '0', // 取件
        STORE: '1', // 存件
    }),
    // 邮件类型
    MAIL_TYPE: Object.freeze({
        REPAIRE: '0', // 报修邮件
        REMIND_TIMEOUT: '1', // 超期提醒
        UPGRADE: '2', // 升级提醒
    }),
    // 报修问题
    REPAIR_TYPE: Object.freeze({
        NULL_REPAIRE: '0', // 无
        BROKEN: '1', // 设备损坏
        PART_BROKEN: '2', // 配件损坏或缺失
        RFID: '3', // RFID标签损坏
        UNKNOWN: '4' // 未知故障
    }),
    // 报修状态
    REPAIR_STATUS: Object.freeze({
        REPORT: '0', // 已报修
        HANDEL: '1', // 修理中
        COMPLETE: '2', // 修理完成
    }),
    // 报修状态
    ADMIN_TYPE: Object.freeze({
        SUPER: '0', // 超级管理员
        LEVEL1: '1', // 一级
        LEVEL2: '2', // 二级
        ORG: '3', // 三级，总经理，部门负责人
        DEP: '4', // 四级，高级经理，科室负责人
        GROUP: '5', // 五级，组长，
        ASSET: '6' // 科室设备管理员
    }),
    // 报修状态
    TAKE_PURPOSE: Object.freeze({
        NORMAL: '0', // 正常使用
        REPAIR: '1', // 修理
        UPGRADE: '2', // 维保标定
    }),
});

const CONSTANTS = Symbol('Context#constants');
module.exports = {
    get constants() {
        // `this` is ctx object
        if (!this[CONSTANTS]) {
            this[CONSTANTS] = constantsObj;
        }
        return this[CONSTANTS];
    },
};
