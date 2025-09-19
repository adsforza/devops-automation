import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Code, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Textarea, useDisclosure, useToast } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listConnections, listScripts, startExecution } from '../../lib/api';

export function ExecutePage() {
	const toast = useToast();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, getValues, reset } = useForm();
	const [preview, setPreview] = useState<string>('');

	const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: listConnections });
	const { data: scripts } = useQuery({ queryKey: ['scripts-all'], queryFn: listScripts });
	const mutation = useMutation({ mutationFn: startExecution, onSuccess: (data) => { toast({ title: 'Ejecución iniciada', description: `ID: ${data.id}`, status: 'success' }); }, onError: (e: any) => { toast({ title: 'Error al ejecutar', description: e?.message || 'Fallo', status: 'error' }); } });

	const selectedScriptId = watch('script') as string | undefined;
	const selectedScript = useMemo(() => (scripts || []).find((s: any) => s.id === selectedScriptId), [scripts, selectedScriptId]);

	// Cuando cambia el script seleccionado, setear defaults de parámetros
	useEffect(() => {
		if (!selectedScript) return;
		// reset solo params, preservando script y connection actuales
		const currentConnection = getValues('connection');
		const base: Record<string, any> = { script: selectedScriptId, connection: currentConnection };
		for (const p of selectedScript.params || []) {
			const def = p.defaultValue ?? '';
			base[p.name] = def;
		}
		reset(base);
	}, [selectedScriptId]);

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
						<Textarea rows={4} placeholder="{ \"key\": \"value\" }" {...commonProps} />
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
							{(connections || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
						</Select>
						<FormErrorMessage>{errors.connection?.message as any}</FormErrorMessage>
					</FormControl>
				</HStack>

				{selectedScript && (
					<Box mb={4}>
						<Heading size="sm" mb={2}>Parámetros</Heading>
						{(selectedScript.params || []).map((p: any) => renderParamField(p))}
					</Box>
				)}

				<Button type="submit" colorScheme="blue" isLoading={isSubmitting}>Previsualizar</Button>
			</form>

			{preview && (
				<Box mt={6}>
					<Heading size="sm" mb={2}>Previsualización</Heading>
					<Code display="block" p={4} whiteSpace="pre-wrap">{preview}</Code>
				</Box>
			)}

			<Modal isOpen={isOpen} onClose={onClose} isCentered>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Confirmar ejecución</ModalHeader>
					<ModalBody>¿Deseas ejecutar este script con los parámetros indicados?</ModalBody>
					<ModalFooter>
						<Button onClick={onClose} variant="ghost">Cancelar</Button>
						<Button colorScheme="blue" onClick={onConfirm} isLoading={mutation.isPending}>Ejecutar</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Box>
	);
}

function buildParams(selectedScript: any, getValues: (name?: string) => any) {
	const params: Record<string, any> = {};
	if (!selectedScript) return params;
	for (const p of selectedScript.params || []) {
		let v = getValues(p.name);
		if (p.type === 'number' && v !== undefined && v !== '') v = Number(v);
		if (p.type === 'boolean') v = v === 'true' || v === true;
		if (p.type === 'json' && typeof v === 'string' && v.trim()) {
			try { v = JSON.parse(v); } catch { /* keep as string */ }
		}
		if (v !== undefined && v !== '') params[p.name] = v;
	}
	return params;
}