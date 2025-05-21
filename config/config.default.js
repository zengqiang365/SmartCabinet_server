/* eslint valid-jsdoc: "off" */

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
const path = require('path');
module.exports = appInfo => {
    /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
    const config = exports = {};

    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1747744575277_1876';

    // add your middleware config here
    config.middleware = [];

    config.static = {
        prefix: '/public/',
        dir: [
            path.join(appInfo.baseDir, 'app/public'),
            path.join(appInfo.baseDir, 'node_modules/bootstrap/dist/'),
        ],
        dynamic: true, // 如果当前访问的静态资源没有缓存，则缓存静态文件，和`preload`配合使用；
        preload: false,
        maxAge: 31536000, // in prod env, 0 in other envs
        buffer: true, // in prod env, false in other envs
    };

    config.logger = {
        level: 'DEBUG',
        consoleLevel: 'DEBUG',
        disableConsoleAfterReady: false, // TODO: production环境切记去掉该参数
        dir: path.join(__dirname, `../logs/${appInfo.name}`),
    };

    // add your user config here
    const userConfig = {
        cluster: {
            listen: { port: 8022 }
        },
        apiV1Prefix: '/api/v1',
        mysql: {
            // database configuration
            client: {
                // host
                host: '127.0.0.1',
                // port
                port: '3306',
                // username
                user: 'root',
                // password
                password: '123456',
                // database
                database: 'cabinet',
            },
            // load into app, default is open
            app: true,
            // load into agent, default is close
            agent: false,
        },
        redis: {
            client: {
                port: 6379,
                host: '127.0.0.1',
                password: '',
                db: 0,
            },
        },
        jwt: {
            enable: true,
            expiresIn: '1d',
            ignore: [
                '/',
                '/api/v1/auth/login',
                '/api/v1/auth/card-login',
                '/api/v1/auth/verify-login-code',
                '/api/v1/health-check',
                '/api/v1/grid/all-grids'
            ],
            secret: '8654369f3ed6ca90435ce2307425a45f'
        },
        cors: {
            origin: '*',
            allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS'
        },
        security: {
            domainWhiteList: [],
            csrf: {
                enable: false
            }
        },
        multipart: {
            mode: 'file',
            tmpdir: path.join(__dirname, `../temp/${appInfo.name}`),
            fileSize: '5mb',
            whitelist: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico'],
            cleanSchedule: {
                // run tmpdir clean job on every day 04:30 am
                // cron style see https://github.com/eggjs/egg-schedule#cron-style-scheduling
                cron: '0 30 4 * * 1',
                disable: false,
            }
        },
        mail: {
            user: 'xx',
            pass: 'xx',
            host: 'xx',
            domain: 'xx',
            from: 'xx',
            repairMail: 'xx'
        },
        lendTime: 7,
    };

    return {
        ...config,
        ...userConfig,
    };
};
