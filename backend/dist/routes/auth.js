import { Router } from 'express';
export const authRouter = Router();
authRouter.get('/me', async (_req, res) => {
    // Placeholder user until OIDC is wired
    res.json({ user: { id: 'system', email: 'system@example.com', roles: ['SuperAdmin'] } });
});
authRouter.post('/login', async (_req, res) => {
    res.status(501).json({ error: 'NotImplemented', message: 'OIDC login not implemented yet' });
});
authRouter.post('/logout', async (_req, res) => {
    res.status(204).send();
});
