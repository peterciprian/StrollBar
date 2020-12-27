import { Router } from 'express';
import UserRouter from './Users';
import AuthRouter from './Auth';

const achievementRouter = require('./routes/achievement.route.ts');

const router = Router();

// Add sub-routes
router.use('/users', UserRouter);
router.use('/auth', AuthRouter);

router.use('/achievement', achievementRouter);

// Export the base-router
export default router;
