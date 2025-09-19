import type { HelmetOptions } from 'helmet';

export function buildCsp(defaultSrc: string): HelmetOptions['contentSecurityPolicy'] {
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