export function buildCsp(defaultSrc) {
    return {
        useDefaults: true,
        directives: {
            defaultSrc: [defaultSrc],
            scriptSrc: [defaultSrc, "'unsafe-inline'"],
            styleSrc: [defaultSrc, "'unsafe-inline'"],
            imgSrc: [defaultSrc, 'data:'],
            connectSrc: [defaultSrc, '*'],
            frameAncestors: [defaultSrc],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
        },
    };
}
