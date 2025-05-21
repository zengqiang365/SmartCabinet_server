class AppBootHook {
    constructor(app) {
        this.app = app;
        app._baseController = require('./app/controller/base-controller');
        this.app.config.appMiddleware.unshift('requestProxy');
    }

    async willReady() {
        // All plugins have started, can do some thing before app ready
        const ctx = this.app.createAnonymousContext();
        this.app.rolePermits = new Map();
        ctx.service.role.getRolePermits();
    }

    async serverDidReady() {
        // Server is listening.
        this.app.server.setTimeout(60 * 60 * 1000);
    }
}

module.exports = AppBootHook;
