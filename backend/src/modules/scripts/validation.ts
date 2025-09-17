import { z } from 'zod';

export const ScriptParamSchema = z.object({
	name: z.string().min(1),
	type: z.enum(['string', 'number', 'boolean', 'date', 'json']),
	required: z.boolean().default(false),
	defaultValue: z.any().optional(),
	validation: z.record(z.any()).optional(),
	orderIndex: z.number().int().min(0).default(0),
});

export const CreateScriptSchema = z.object({
	key: z.string().min(3),
	name: z.string().min(3),
	description: z.string().optional(),
	params: z.array(ScriptParamSchema).default([]),
	connections: z.array(z.string()).default([]),
});

export type CreateScriptInput = z.infer<typeof CreateScriptSchema>;

export const CreateScriptVersionSchema = z.object({
	sqlText: z.string().min(1),
});

export type CreateScriptVersionInput = z.infer<typeof CreateScriptVersionSchema>;