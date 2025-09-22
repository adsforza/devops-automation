import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthUser {
    id: string;
    email?: string;
    displayName?: string;
    roles?: string[];
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthUser;
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jwt.verify(token, env.SESSION_SECRET) as any;
        req.user = payload.user as AuthUser;
        return next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

export function requireRoles(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const userRoles = new Set(req.user.roles || []);
        const ok = roles.some((r) => userRoles.has(r));
        if (!ok) return res.status(403).json({ error: 'Forbidden' });
        return next();
    };
}

