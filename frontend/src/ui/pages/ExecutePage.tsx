import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Code, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Select, Textarea, useToast, FormHelperText, Stack, Badge, Table, Thead, Tbody, Tr, Th, Td, Spinner, Checkbox, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
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
	const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, getValues, reset } = useForm();
	const [preview, setPreview] = useState<string>('');

	const { data: connections = [] } = useQuery({ queryKey: ['connections'], queryFn: listConnections });
	const { data: scripts = [] } = useQuery({ queryKey: ['scripts-all'], queryFn: listScripts });
    const [lastExecId, setLastExecId] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<Array<Record<string, unknown>> | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(100);
    const [visibleCols, setVisibleCols] = useState<string[] | null>(null);
    const mutation = useMutation({
        mutationFn: startExecution,
        onSuccess: async (data) => {
            toast({ title: 'Ejecución iniciada', description: `ID: ${data.id}`, status: 'success' });
            // Poll execution until finished and then fetch logs to extract rows
            const id = data.id;
            setLastExecId(id);
            let attempts = 0;
            let status = 'running';
            setIsPolling(true);
            while (attempts < 30 && status === 'running') {
                await new Promise((r) => setTimeout(r, 1000));
                const exec = await api.get(`/executions/${id}`);
                status = exec.data.execution.status;
                if (status !== 'running') {
                    // Fetch first page from backend paginated endpoint
                    const res = await api.get(`/executions/${id}/result`, { params: { limit: pageSize, offset: 0 } });
                    setLastResult(res.data.items || []);
                    setPage(0);
                    setVisibleCols(null);
                    break;
                }
                attempts += 1;
            }
            setIsPolling(false);
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
	};

    const onRun = async () => {
		const params = buildParams(selectedScript, getValues);
		await mutation.mutateAsync({ scriptId: selectedScriptId!, dbConnectionId: getValues('connection'), params });
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

                <HStack spacing={3}>
                    <Button type="submit" colorScheme="gray" isLoading={isSubmitting} isDisabled={!canSubmit}>Previsualizar</Button>
                    <Button colorScheme="blue" onClick={onRun} isLoading={mutation.isPending} isDisabled={!canSubmit}>Ejecutar</Button>
                </HStack>
			</form>

			{preview && (
				<Box mt={6}>
					<Heading size="sm" mb={2}>Previsualización</Heading>
					<Code display="block" p={4} whiteSpace="pre-wrap">{preview}</Code>
				</Box>
			)}

			{isPolling && (
				<HStack mt={4}>
					<Spinner size="sm" />
					<Heading size="xs">Ejecutando...</Heading>
				</HStack>
			)}

			{lastResult && (
				<Box mt={6}>
					<Heading size="sm" mb={2}>Resultados (parcial)</Heading>
					<ResultToolbar
						page={page}
						pageSize={pageSize}
						onChangePage={async (p) => {
							if (!lastExecId) return;
							const res = await api.get(`/executions/${lastExecId}/result`, { params: { limit: pageSize, offset: p * pageSize } });
							setLastResult(res.data.items || []);
							setPage(p);
						}}
						onChangePageSize={async (s) => {
							if (!lastExecId) return;
							const res = await api.get(`/executions/${lastExecId}/result`, { params: { limit: s, offset: 0 } });
							setPageSize(s);
							setPage(0);
							setLastResult(res.data.items || []);
						}}
						columns={computeColumns(lastResult)}
						visibleCols={visibleCols}
						onToggleColumn={(col) => toggleCol(col, visibleCols, setVisibleCols)}
						onDownloadCsv={() => downloadCsv(lastResult, visibleCols)}
						onDownloadJson={() => downloadJson(lastResult, visibleCols)}
					/>
					<ResultTable rows={lastResult} columns={filterColumns(computeColumns(lastResult), visibleCols)} />
				</Box>
			)}
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

function ResultTable({ rows, columns }: { rows: Array<Record<string, unknown>>; columns: string[] }) {
    if (!rows || rows.length === 0) return <Code display="block" p={4}>Sin resultados</Code>;
    return (
        <Table size="sm" variant="striped">
            <Thead>
                <Tr>
                    {columns.map((c: string) => <Th key={String(c)}>{String(c)}</Th>)}
                </Tr>
            </Thead>
            <Tbody>
                {rows.map((r, idx) => (
                    <Tr key={idx}>
                        {columns.map((c: string) => {
                            const cell = (r as Record<string, unknown>)[c];
                            return <Td key={String(c)}><Code whiteSpace="pre">{formatCell(cell)}</Code></Td>;
                        })}
                    </Tr>
                ))}
            </Tbody>
        </Table>
    );
}

function formatCell(v: any): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

function computeColumns(rows: Array<Record<string, unknown>>): string[] {
    return Array.from(rows.reduce((set: Set<string>, r) => { Object.keys(r || {}).forEach((k) => set.add(k)); return set; }, new Set<string>())) as string[];
}

function filterColumns(columns: string[], visible: string[] | null): string[] {
    if (!visible || visible.length === 0) return columns;
    const set = new Set(visible);
    return columns.filter((c) => set.has(c));
}

function toggleCol(col: string, visible: string[] | null, setVisible: (v: string[]) => void) {
    const set = new Set(visible || []);
    if (set.has(col)) set.delete(col); else set.add(col);
    setVisible(Array.from(set));
}

function downloadCsv(rows: Array<Record<string, unknown>>, visible: string[] | null) {
    const cols = computeColumns(rows);
    const finalCols = filterColumns(cols, visible);
    const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const header = finalCols.map((c) => escape(String(c))).join(',');
    const body = rows.map((r) => finalCols.map((c) => escape(formatCell((r as any)[c]))).join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'resultado.csv'; a.click();
    URL.revokeObjectURL(url);
}

function downloadJson(rows: Array<Record<string, unknown>>, visible: string[] | null) {
    const cols = computeColumns(rows);
    const finalCols = filterColumns(cols, visible);
    const data = rows.map((r) => finalCols.reduce((acc: any, c) => { acc[c] = (r as any)[c]; return acc; }, {} as any));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'resultado.json'; a.click();
    URL.revokeObjectURL(url);
}

function ResultToolbar(props: {
    page: number;
    pageSize: number;
    onChangePage: (p: number) => void | Promise<void>;
    onChangePageSize: (s: number) => void | Promise<void>;
    columns: string[];
    visibleCols: string[] | null;
    onToggleColumn: (c: string) => void;
    onDownloadCsv: () => void;
    onDownloadJson: () => void;
}) {
    const sizes = [50, 100, 250, 500, 1000];
    return (
        <HStack mb={3} spacing={3} align="center">
            <HStack>
                <Button onClick={() => props.onChangePage(Math.max(props.page - 1, 0))} isDisabled={props.page === 0}>Prev</Button>
                <Button onClick={() => props.onChangePage(props.page + 1)}>Next</Button>
            </HStack>
            <Select width="140px" value={String(props.pageSize)} onChange={(e) => props.onChangePageSize(Number(e.target.value))}>
                {sizes.map((s) => <option key={s} value={s}>{s} filas</option>)}
            </Select>
            <Menu>
                <MenuButton as={Button}>
                    Columnas
                </MenuButton>
                <MenuList minW="240px">
                    {props.columns.map((c) => (
                        <MenuItem key={c} closeOnSelect={false}>
                            <HStack>
                                <Checkbox isChecked={!props.visibleCols || props.visibleCols.includes(c)} onChange={() => props.onToggleColumn(c)} />
                                <Code>{c}</Code>
                            </HStack>
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
            <Button onClick={props.onDownloadCsv}>CSV</Button>
            <Button onClick={props.onDownloadJson}>JSON</Button>
        </HStack>
    );
}