import express from 'express';
import { agentLogin, agentLogout } from '../Controller/AgentAuthController.js';

const router = express.Router();

router.post('/login', agentLogin);
router.post('/logout', agentLogout);

export default router;