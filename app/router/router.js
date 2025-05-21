/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    router.get(app.config.apiV1Prefix + '/health-check', ctx => {
        ctx.body = {
            status: 'OK'
        };
    });
    router.get('/', controller.home.index);
};
