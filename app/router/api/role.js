module.exports = app => {
    let { router, controller } = app;
    const subRouter = router.namespace(app.config.apiV1Prefix + '/role');
    controller = controller.role;

    subRouter.get('/roles', controller.getRoles);
    subRouter.get('/all-roles', controller.getAllRoles);
    subRouter.get('/role', controller.findRoleById);
    subRouter.get('/role-by-code', controller.findRoleByCode);
    subRouter.post('/add-role', controller.addRole);
    subRouter.put('/edit-role', controller.editRole);
    subRouter.post('/edit-permits', controller.editPermits);
    subRouter.delete('/delete-roles', controller.deleteRoles);
};
