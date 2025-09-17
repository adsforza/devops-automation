import { useState } from 'react';
import { Box, Button, Code, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, useDisclosure, useToast } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listConnections, listScripts, startExecution } from '../../lib/api';

export function ExecutePage() {
	const toast = useToast();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
	const [preview, setPreview] = useState<string>('');

	const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: listConnections });
	const { data: scripts } = useQuery({ queryKey: ['scripts'], queryFn: listScripts });
	const mutation = useMutation({ mutationFn: startExecution, onSuccess: () => toast({ title: 'Ejecución iniciada', status: 'success' }) });

	const onSubmit = async (values: any) => {
		setPreview(`-- Vista previa\nScript: ${values.script}\nDB: ${values.connection}\nParams: ${JSON.stringify({ foo: values.foo }, null, 2)}`);
		onOpen();
	};

	const onConfirm = async () => {
		const values: any = { scriptId: watch('script'), dbConnectionId: watch('connection'), params: { foo: watch('foo') } };
		await mutation.mutateAsync(values);
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

				<FormControl mb={4}>
					<FormLabel>Parámetro foo</FormLabel>
					<Input placeholder="valor" {...register('foo')} />
				</FormControl>

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