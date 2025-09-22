import type { HelmetOptions } from 'helmet';

export function buildCsp(defaultSrc: string): HelmetOptions['contentSecurityPolicy'] {
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = [defaultSrc, ...(isDev ? ["'unsafe-inline'"] : [])];
    const styleSrc = [defaultSrc, ...(isDev ? ["'unsafe-inline'"] : [])];
    const connectSrc = [defaultSrc, ...(isDev ? ['ws:', 'http://localhost:5173'] : [])];

    return {
        useDefaults: true,
        directives: {
            defaultSrc: [defaultSrc],
            scriptSrc,
            styleSrc,
            imgSrc: [defaultSrc, 'data:'],
            connectSrc,
            frameAncestors: [defaultSrc],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
        },
    };
}