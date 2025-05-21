module.exports = app => {
    let { router, controller } = app;
    const subRouter = router.namespace(app.config.apiV1Prefix + '/auth');
    controller = controller.user;

    subRouter.post('/login', controller.login);
    subRouter.get('/logout', controller.logout);
    subRouter.post('/card-login', controller.cardLogin);
    subRouter.post('/verify-login-code', controller.checkVerifyCode);
    subRouter.get('/users', controller.getUsers);
    subRouter.get('/user', controller.findUserById);
    subRouter.post('/add-user', controller.addUser);
    subRouter.put('/edit-user', controller.editUser);
    subRouter.delete('/delete-users', controller.deleteUsers);
    subRouter.post('/modify-password', controller.modifyPassword);
    subRouter.get('/get-user-org', controller.getUserOrgInfo);
};
