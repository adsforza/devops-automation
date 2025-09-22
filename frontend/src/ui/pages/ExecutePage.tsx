import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Code, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Textarea, useDisclosure, useToast, FormHelperText, Stack, Badge } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, listConnections, listScripts, startExecution } from '../../lib/api';

function b64decode(b64?: string) {
	if (!b64) return '';
	try { return atob(b64); } catch { return ''; }
}

function safeParse(msg: string): any | null {
    try { return JSON.parse(msg); } catch { return null; }
}

export function ExecutePage() {
	const toast = useToast();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, getValues, reset } = useForm();
	const [preview, setPreview] = useState<string>('');

	const { data: connections = [] } = useQuery({ queryKey: ['connections'], queryFn: listConnections });
	const { data: scripts = [] } = useQuery({ queryKey: ['scripts-all'], queryFn: listScripts });
    const [lastResult, setLastResult] = useState<any[] | null>(null);
    const mutation = useMutation({
        mutationFn: startExecution,
        onSuccess: async (data) => {
            toast({ title: 'Ejecución iniciada', description: `ID: ${data.id}`, status: 'success' });
            // Poll execution until finished and then fetch logs to extract rows
            const id = data.id;
            let attempts = 0;
            let status = 'running';
            while (attempts < 30 && status === 'running') {
                await new Promise((r) => setTimeout(r, 1000));
                const exec = await api.get(`/executions/${id}`);
                status = exec.data.execution.status;
                if (status !== 'running') {
                    const logs = exec.data.logs as Array<{ message: string }>; 
                    const rowsLog = logs.map((l) => safeParse(l.message)).find((p) => p && p.type === 'rows');
                    setLastResult(rowsLog?.rows || null);
                    break;
                }
                attempts += 1;
            }
        },
        onError: (e: any) => { const msg = e?.response?.data?.message || e?.message || 'Fallo'; toast({ title: 'Error al ejecutar', description: msg, status: 'error' }); }
    });

	const selectedScriptId = watch('script') as string | undefined;
	const selectedConnectionId = watch('connection') as string | undefined;
	const selectedScript: any = useMemo(() => (scripts || []).find((s: any) => s.id === selectedScriptId), [scripts, selectedScriptId]);

	// Allowed connections by script
	const allowedConnectionIds = useMemo(() => (selectedScript?.dbLinks || []).map((l: any) => l.dbConnectionId) as string[], [selectedScript]);
	const filteredConnections = useMemo(() => {
		if (!selectedScript) return connections;
		return connections.filter((c: any) => allowedConnectionIds.includes(c.id));
	}, [connections, selectedScript, allowedConnectionIds]);
	const connectionNotAllowed = !!selectedScript && !!selectedConnectionId && !allowedConnectionIds.includes(selectedConnectionId);

	// Latest SQL for preview
	const latestSql = useMemo(() => {
		if (!selectedScript || !selectedScript.versions || selectedScript.versions.length === 0) return '';
		const latest = [...selectedScript.versions].sort((a: any, b: any) => b.version - a.version)[0];
		return b64decode(latest.sqlTextEnc);
	}, [selectedScript]);

	// Extract placeholders from SQL
	const sqlParamNames = useMemo(() => {
		if (!latestSql) return [] as string[];
		const names = new Set<string>();
		const re = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(latestSql)) !== null) names.add(m[1]);
		return Array.from(names);
	}, [latestSql]);

	// When script changes, reset params defaults and auto-select first allowed connection
	useEffect(() => {
		if (!selectedScript) return;
		const base: Record<string, any> = { script: selectedScriptId, connection: undefined };
		for (const p of (selectedScript as any).params || []) {
			const def = (p as any).defaultValue ?? '';
			base[(p as any).name] = def;
		}
		reset(base);
		// auto-select first allowed connection if exists
		setTimeout(() => {
			if (allowedConnectionIds.length > 0) setValue('connection', allowedConnectionIds[0]);
		}, 0);
	}, [selectedScriptId]);

	// Required completeness check
	const requiredNames = useMemo(() => (selectedScript?.params || []).filter((p: any) => p.required).map((p: any) => p.name) as string[], [selectedScript]);
	const watchedAll = watch();
	const requiredFilled = useMemo(() => requiredNames.every((n) => {
		const v = (watchedAll as any)[n];
		return v !== undefined && v !== '';
	}), [requiredNames, watchedAll]);

	function renderParamField(p: any) {
		const name = p.name as string;
		const required = !!p.required;
		const commonProps = register(name, { required: required ? 'Requerido' : false });
		switch (p.type) {
			case 'number':
				return (
					<FormControl key={name} isInvalid={!!(errors as any)[name]} isRequired={required} mb={3}>
						<FormLabel>{name}</FormLabel>
						<Input type="number" step="any" {...register(name, { required: required ? 'Requerido' : false, setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />
						<FormErrorMessage>{(errors as any)[name]?.message as any}</FormErrorMessage>
					</FormControl>
				);
			case 'date':
				return (
					<FormControl key={name} isInvalid={!!(errors as any)[name]} isRequired={required} mb={3}>
						<FormLabel>{name}</FormLabel>
						<Input type="date" {...commonProps} />
						<FormErrorMessage>{(errors as any)[name]?.message as any}</FormErrorMessage>
					</FormControl>
				);
			case 'boolean':
				return (
					<FormControl key={name} isInvalid={!!(errors as any)[name]} isRequired={required} mb={3}>
						<FormLabel>{name}</FormLabel>
						<Select {...register(name, { required: required ? 'Requerido' : false })}>
							<option value="">Selecciona</option>
							<option value="true">true</option>
							<option value="false">false</option>
						</Select>
						<FormErrorMessage>{(errors as any)[name]?.message as any}</FormErrorMessage>
					</FormControl>
				);
			case 'json':
				return (
					<FormControl key={name} isInvalid={!!(errors as any)[name]} isRequired={required} mb={3}>
						<FormLabel>{name}</FormLabel>
						<Textarea rows={4} placeholder={'{ "key": "value" }'} {...commonProps} />
						<FormErrorMessage>{(errors as any)[name]?.message as any}</FormErrorMessage>
					</FormControl>
				);
			default:
				return (
					<FormControl key={name} isInvalid={!!(errors as any)[name]} isRequired={required} mb={3}>
						<FormLabel>{name}</FormLabel>
						<Input placeholder={name} {...commonProps} />
						<FormErrorMessage>{(errors as any)[name]?.message as any}</FormErrorMessage>
					</FormControl>
				);
		}
	}

	const onSubmit = async () => {
		const params = buildParams(selectedScript, getValues);
		setPreview(`-- Vista previa\nScript: ${selectedScript?.name}\nDB: ${getValues('connection')}\nParams: ${JSON.stringify(params, null, 2)}`);
		onOpen();
	};

	const onConfirm = async () => {
		const params = buildParams(selectedScript, getValues);
		await mutation.mutateAsync({ scriptId: selectedScriptId!, dbConnectionId: getValues('connection'), params });
		onClose();
	};

	const canSubmit = !!selectedScriptId && !!selectedConnectionId && !connectionNotAllowed && requiredFilled;

	return (
		<Box>
			<Heading size="lg" mb={4}>Ejecutar Script</Heading>
			<form onSubmit={handleSubmit(onSubmit)}>
				<HStack spacing={4} mb={4}>
					<FormControl isInvalid={!!errors.script}>
						<FormLabel>Script</FormLabel>
						<Select placeholder="Selecciona" {...register('script', { required: 'Requerido' })}>
							{(scripts || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
						</Select>
						<FormErrorMessage>{errors.script?.message as any}</FormErrorMessage>
					</FormControl>
					<FormControl isInvalid={!!errors.connection}>
						<FormLabel>Conexión</FormLabel>
						<Select placeholder="Selecciona" {...register('connection', { required: 'Requerido' })}>
							{(filteredConnections || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
						</Select>
						{connectionNotAllowed && <FormHelperText color="red.500">El script no está habilitado en esta conexión</FormHelperText>}
						<FormErrorMessage>{errors.connection?.message as any}</FormErrorMessage>
					</FormControl>
				</HStack>

				{selectedScript && (
					<Box mb={4}>
						<Heading size="sm" mb={2}>Parámetros</Heading>
						{(selectedScript.params || []).map((p: any) => renderParamField(p))}
						<Stack mt={4} spacing={2}>
							<Heading size="sm">SQL (versión actual)</Heading>
							<Code display="block" p={3} whiteSpace="pre">{latestSql || 'Sin versiones'}</Code>
							{sqlParamNames.length > 0 && (
								<Box>
									<Heading size="xs" mb={1}>Placeholders detectados</Heading>
									{sqlParamNames.map((n) => {
										const isReq = requiredNames.includes(n);
										const hasVal = !!(watchedAll as any)[n];
										return <HStack key={n} spacing={2}><Badge colorScheme={hasVal ? 'green' : 'red'}>{hasVal ? 'OK' : 'Falta'}</Badge><Code>{`:${n}`}</Code>{isReq && <Badge>Requerido</Badge>}</HStack>;
									})}
								</Box>
							)}
						</Stack>
					</Box>
				)}

				<Button type="submit" colorScheme="blue" isLoading={isSubmitting} isDisabled={!canSubmit}>Previsualizar</Button>
			</form>

			{preview && (
				<Box mt={6}>
					<Heading size="sm" mb={2}>Previsualización</Heading>
					<Code display="block" p={4} whiteSpace="pre-wrap">{preview}</Code>
				</Box>
			)}

			{lastResult && (
				<Box mt={6}>
					<Heading size="sm" mb={2}>Resultados (parcial)</Heading>
					<Code display="block" p={4} whiteSpace="pre-wrap">{JSON.stringify(lastResult, null, 2)}</Code>
				</Box>
			)}

			<Modal isOpen={isOpen} onClose={onClose} isCentered>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Confirmar ejecución</ModalHeader>
					<ModalBody>¿Deseas ejecutar este script con los parámetros indicados?</ModalBody>
					<ModalFooter>
						<Button onClick={onClose} variant="ghost">Cancelar</Button>
						<Button colorScheme="blue" onClick={onConfirm} isLoading={mutation.isPending} isDisabled={!canSubmit}>Ejecutar</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Box>
	);
}

function buildParams(selectedScript: any, getValues: (name?: string) => any) {
	const params: Record<string, any> = {};
	if (!selectedScript) return params;
	for (const p of (selectedScript as any).params || []) {
		let v = getValues((p as any).name);
		if ((p as any).type === 'number' && v !== undefined && v !== '') v = Number(v);
		if ((p as any).type === 'boolean') v = v === 'true' || v === true;
		if ((p as any).type === 'json' && typeof v === 'string' && v.trim()) {
			try { v = JSON.parse(v); } catch { /* keep as string */ }
		}
		if (v !== undefined && v !== '') params[(p as any).name] = v;
	}
	return params;
}