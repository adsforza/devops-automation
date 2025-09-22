import { Router } from 'express';
import { Issuer, generators } from 'openid-client';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../common/logger.js';

let oidcClient: any = null;
let codeVerifier: string | null = null;

export const authRouter = Router();

authRouter.get('/me', async (req, res) => {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jwt.verify(token, env.SESSION_SECRET) as any;
        return res.json({ user: payload.user });
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
});

authRouter.get('/login', async (req, res) => {
    try {
        if (!env.OIDC_ISSUER_URL || !env.OIDC_CLIENT_ID || !env.OIDC_REDIRECT_URI) {
            return res.status(503).json({ error: 'AuthDisabled' });
        }
        const issuer = await Issuer.discover(env.OIDC_ISSUER_URL);
        oidcClient = new issuer.Client({ client_id: env.OIDC_CLIENT_ID, client_secret: env.OIDC_CLIENT_SECRET });
        const state = generators.state();
        codeVerifier = generators.codeVerifier();
        const codeChallenge = generators.codeChallenge(codeVerifier);
        const url = oidcClient.authorizationUrl({
            scope: 'openid profile email',
            redirect_uri: env.OIDC_REDIRECT_URI,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        res.redirect(url);
    } catch (e) {
        logger.error({ e }, 'OIDC login failed');
        res.status(500).json({ error: 'AuthError' });
    }
});

authRouter.get('/callback', async (req, res) => {
    try {
        if (!oidcClient || !codeVerifier) return res.status(400).json({ error: 'InvalidState' });
        const params = oidcClient.callbackParams(req);
        const tokenSet = await oidcClient.callback(env.OIDC_REDIRECT_URI!, params, { code_verifier: codeVerifier });
        const userinfo = await oidcClient.userinfo(tokenSet.access_token!);
        const user = {
            id: userinfo.sub,
            email: (userinfo as any).email || '',
            displayName: (userinfo as any).name || '',
            roles: ['User'],
        };
        const jwtToken = jwt.sign({ user }, env.SESSION_SECRET, { expiresIn: env.SESSION_COOKIE_TTL_SECONDS });
        res.cookie(env.COOKIE_NAME, jwtToken, {
            httpOnly: true,
            sameSite: env.COOKIE_SAME_SITE as any,
            secure: env.COOKIE_SECURE,
            maxAge: env.SESSION_COOKIE_TTL_SECONDS * 1000,
        });
        res.redirect('/');
    } catch (e) {
        logger.error({ e }, 'OIDC callback failed');
        res.status(500).json({ error: 'AuthError' });
    }
});

authRouter.post('/logout', async (_req, res) => {
    res.clearCookie(env.COOKIE_NAME);
    res.status(204).send();
});