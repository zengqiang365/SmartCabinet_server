module.exports = app => {
    let { router, controller } = app;
    const subRouter = router.namespace(app.config.apiV1Prefix + '/org');
    controller = controller.organization;

    subRouter.get('/orgs', controller.getOrgs);
    subRouter.get('/all-orgs', controller.allOrgs);
    subRouter.get('/org', controller.findOrgById);
    subRouter.post('/add-org', controller.addOrg);
    subRouter.put('/edit-org', controller.editOrg);
    subRouter.delete('/delete-orgs', controller.deleteOrgs);
    subRouter.get('/orgtree', controller.getOrgTree);
    subRouter.get('/org-cascader', controller.getOrgCascader);
    subRouter.post('/save-orgtree', controller.saveOrgTree);
};
