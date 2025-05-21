/**
 * created by zq on 2025/5/21
 */

const Controller = require('egg').Controller;
const _ = require('lodash');
const nullObject = {};

class BaseController extends Controller {

    constructor(ctx, service) {
        super(ctx);
        this._service = service;
    }

    async listPage(ctx) {
        BaseController.checkParameterAndPage(ctx, { required: ['pageSize', 'pageNum'] });
        const cond = { isDeleted: false };
        const list = await this._service.page(ctx.page, cond);
        const total = await this._service.count(cond);
        ctx.body = { list, total };
    }

    /**
      * @param ctx
      * @param options : {required: [], optional: []}
      * @return {{}}
      */
    static checkParameter(ctx, options) {

        if (!ctx) { throw { code: '1001', message: 'business error' }; }
        if (!options) { return nullObject; }
        const required = options.required;
        const optional = options.optional;
        const original = _.extendWith(ctx.data.body || {}, ctx.data.query || {}, ctx.params || {});
        if (required) {
            required.forEach(c => {
                if (!_.hasIn(original, c)) { throw { code: '1002', message: `参数 ${c} 缺失` }; }
            });
        }
        ctx.data = _.pick(original, _.union(required || [], optional || []));
    }

    static page(ctx) {
        if (!ctx) { throw { code: '1001', message: 'buseiness error' }; }
        const pageNum = parseInt(ctx.data.pageNum) || 1;
        const pageSize = parseInt(ctx.data.pageSize) || 10;
        ctx.page = {
            pageNum,
            pageSize,
            limit: pageSize,
            skip: (pageNum - 1) * pageSize,
            // sortBy: ctx.data.sortBy || null,
            sort: parseInt(ctx.data.sort) || -1, // default: sort by 'updatedAt', -1:desc, 1:asc
        };
    }

    /**
      *
      * 想同时checkparameter 并且 获取ctx.page对象，pageNum、pageSize 是必传参数。
      * @param ctx
      * @param options ：{required: ['pageNum', 'pageSize']}
      */
    static checkParameterAndPage(ctx, options) {
        BaseController.checkParameter(ctx, options);
        BaseController.page(ctx);
    }

}

module.exports = BaseController;

