import { useState } from 'react';
import { Box, Button, Code, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Spinner, Textarea, useDisclosure, useToast } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';

export function ExecutePage() {
	const toast = useToast();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
	const [preview, setPreview] = useState<string>('');

	const onSubmit = async (values: any) => {
		setPreview(`-- Vista previa\nScript: ${values.script}\nDB: ${values.connection}\nParam foo: ${values.foo}`);
		onOpen();
	};

	const onConfirm = async () => {
		toast({ title: 'Ejecución iniciada', status: 'success' });
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
							<option value="script-1">Script 1</option>
						</Select>
						<FormErrorMessage>{errors.script?.message as any}</FormErrorMessage>
					</FormControl>
					<FormControl isInvalid={!!errors.connection}>
						<FormLabel>Conexión</FormLabel>
						<Select placeholder="Selecciona" {...register('connection', { required: 'Requerido' })}>
							<option value="conn-1">Conn 1</option>
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
					<ModalBody>
						¿Deseas ejecutar este script con los parámetros indicados?
					</ModalBody>
					<ModalFooter>
						<Button onClick={onClose} variant="ghost">Cancelar</Button>
						<Button colorScheme="blue" onClick={onConfirm}>Ejecutar</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Box>
	);
}