module.exports = app => {
    let { router, controller } = app;
    const subRouter = router.namespace(app.config.apiV1Prefix + '/mail');
    controller = controller.mail;

    subRouter.get('/mails', controller.getMails);
    subRouter.get('/mail', controller.findMailById);
    subRouter.post('/add-mail', controller.addMail);
    subRouter.put('/edit-mail', controller.editMail);
};
