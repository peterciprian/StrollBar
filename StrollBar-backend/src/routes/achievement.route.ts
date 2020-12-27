const achievementRouter = require('express').Router();

achievementRouter.get('/', achievementRouter.list);
achievementRouter.get('/:id', achievementRouter.find);
achievementRouter.post('/', achievementRouter.create);
achievementRouter.put('/:id', achievementRouter.update);
achievementRouter.delete('/:id', achievementRouter.delete);

export default achievementRouter;