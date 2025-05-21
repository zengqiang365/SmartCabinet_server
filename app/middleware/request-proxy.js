module.exports = () => {
    return async function requestProxy(ctx, next) {
        // 响应结构体
        const responseData = {
            business: 0,
            date: '',
            errorCode: '',            // 错误码
            errorMessage: '',         // 错误信息提示
            data: {                    // 数据返回对象 和之前中间件的data一样
                message: ''
            },
            params: [                 //
                ''
            ],
            requestId: '',
            success: true,             // 接口是否请求成功
            version: ''
        };
        let rurl = ctx.req.url;
        if (rurl.includes('?')) {
            rurl = rurl.substring(0, rurl.indexOf('?'));
        }
        let username = '未知';
        // ctx.logger.info(`requstURL: ${ctx.req.url}`);
        if (!ctx.app.config.jwt.ignore.includes(rurl)) {
            let token = ctx.request.header.authorization;
            if (token && token.length > 10) {
                token = token.substring(7);
                try {
                    const decode = ctx.app.jwt.verify(token, ctx.app.config.jwt.secret);
                    ctx.userInfo = decode;
                    const tok = await ctx.app.redis.get(ctx.userInfo.username);
                    if (!tok) { // 验证token
                        return ctx.body = Object.assign(responseData, { errorCode: '300', errorMessage: '凭据错误', success: false });
                    }
                    username = ctx.userInfo.name;
                    if (!ctx.app.rolePermits.get(ctx.userInfo.role).has(rurl)) {
                        return ctx.body = Object.assign(responseData, { errorCode: '400', errorMessage: '您无权限', success: false });
                    }
                } catch (err) {
                    if (err.name === 'TokenExpiredError') {
                        return ctx.body = Object.assign(responseData, { errorCode: '300', errorMessage: '凭据过期，请重新登录', success: false });
                    } else if (err.name === 'JsonWebTokenError') {
                        return ctx.body = Object.assign(responseData, { errorCode: '300', errorMessage: '凭据错误', success: false });
                    }
                }
            } else {
                return ctx.body = Object.assign(responseData, { errorCode: '300', errorMessage: '凭据为空', success: false });
            }
        }
        ctx.data = { query: ctx.query || {}, body: ctx.request.body || {}, params: ctx.params || {} };
        try {
            await next();
            ctx.logger.info(`${username} query params: ${JSON.stringify(ctx.data)}`);
            if (ctx.status >= 400) {
                ctx.logger.error(`${username} status: ${ctx.status}, reason: ${ctx.message}`);
                ctx.body = Object.assign(responseData, { errorCode: '0001', errorMessage: ctx.message || '', success: false });
            } else {
                ctx.status = 200;
                ctx.body = Object.assign(responseData, { data: ctx.body || {} });
                ctx.logger.info(`${username} result: ${JSON.stringify(ctx.body)}`);
            }
        } catch (e) {
            ctx.body = Object.assign(responseData, { errorCode: '0001', errorMessage: ctx.reason || e.message || '', success: false });
            if (e.name === 'BusinessError') {
                ctx.logger.error(`${username} BusinessError: ${JSON.stringify(ctx.body)}`);
            } else {
                ctx.logger.error(`${username} status: ${ctx.status}, reason: ${e.message}\ncall stack =>\n${e.stack}\n`);
            }
        }
    };
};
