import { Box, Button, FormControl, FormLabel, HStack, Heading, Input, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';

export function AuditPage() {
	return (
		<Box>
			<Heading size="lg" mb={4}>Auditoría</Heading>
			<HStack spacing={4} mb={4}>
				<FormControl maxW="xs">
					<FormLabel>Usuario</FormLabel>
					<Input placeholder="userId" />
				</FormControl>
				<FormControl maxW="xs">
					<FormLabel>Acción</FormLabel>
					<Input placeholder="action" />
				</FormControl>
				<Button colorScheme="blue">Buscar</Button>
			</HStack>
			<Table size="sm">
				<Thead><Tr><Th>Fecha</Th><Th>Acción</Th><Th>Recurso</Th><Th>Usuario</Th></Tr></Thead>
				<Tbody>
					<Tr><Td colSpan={4}>Sin datos</Td></Tr>
				</Tbody>
			</Table>
		</Box>
	);
}