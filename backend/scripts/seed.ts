import { prisma } from '../src/db/prisma.js';

async function main() {
	const roles = ['SuperAdmin', 'DatabaseAdmin', 'ScriptExecutor', 'ReadOnlyUser'];
	for (const name of roles) {
		await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
	}
	// Example script (no connections linked by default)
	const script = await prisma.script.upsert({
		where: { key: 'hello_world' },
		update: {},
		create: { key: 'hello_world', name: 'Hello World', createdBy: 'seed' },
	});
	await prisma.scriptVersion.upsert({
		where: { id: script.id + '-v1' },
		update: {},
		create: { id: script.id + '-v1', scriptId: script.id, version: 1, sqlTextEnc: Buffer.from('SELECT 1', 'utf8').toString('base64'), checksum: 'seed', createdBy: 'seed', isValidated: true },
	});
	console.log('Seed completed');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });