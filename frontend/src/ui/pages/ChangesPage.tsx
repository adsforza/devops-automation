import { Box, Button, FormControl, FormLabel, HStack, Heading, Input, Table, Tbody, Td, Th, Thead, Tr, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Select } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { changesByPk, changesList } from '../../lib/api';
import { useMemo, useState } from 'react';

function jsonDiff(before: any, after: any) {
	try {
		const b = JSON.stringify(before, null, 2);
		const a = JSON.stringify(after, null, 2);
		return `--- before\n${b}\n+++ after\n${a}`;
	} catch {
		return '';
	}
}

export function ChangesPage() {
	const [filters, setFilters] = useState<{ table?: string; pk?: string; userId?: string; from?: string; to?: string }>({});
	const [page, setPage] = useState(0);
	const limit = 10;
	const { data } = useQuery({ queryKey: ['changes', filters, page], queryFn: () => changesList({ ...filters, limit, offset: page * limit }) });
	const items = data?.items || [];
	const total = data?.total || 0;
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [selected, setSelected] = useState<any | null>(null);

	return (
		<Box>
			<Heading size="lg" mb={4}>Historial de cambios</Heading>
			<HStack spacing={4} mb={4}>
				<FormControl maxW="xs"><FormLabel>Tabla</FormLabel><Input value={filters.table || ''} onChange={(e) => setFilters({ ...filters, table: e.target.value || undefined })} placeholder="schema.table" /></FormControl>
				<FormControl maxW="xs"><FormLabel>PK</FormLabel><Input value={filters.pk || ''} onChange={(e) => setFilters({ ...filters, pk: e.target.value || undefined })} /></FormControl>
				<FormControl maxW="xs"><FormLabel>Usuario</FormLabel><Input value={filters.userId || ''} onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })} /></FormControl>
				<Button onClick={() => setPage(0)} colorScheme="blue">Buscar</Button>
			</HStack>
			<Table size="sm">
				<Thead><Tr><Th>Fecha</Th><Th>Tabla</Th><Th>PK</Th><Th>Operación</Th></Tr></Thead>
				<Tbody>
					{items.map((c: any) => (
						<Tr key={c.id} onClick={() => { setSelected(c); onOpen(); }} style={{ cursor: 'pointer' }}>
							<Td>{new Date(c.changeTime).toLocaleString()}</Td>
							<Td>{c.tableFqdn}</Td>
							<Td>{c.pk}</Td>
							<Td>{c.operation}</Td>
						</Tr>
					))}
					{items.length === 0 && <Tr><Td colSpan={4}>Sin datos</Td></Tr>}
				</Tbody>
			</Table>
			<HStack mt={4} justify="flex-end">
				<Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} isDisabled={page === 0}>Anterior</Button>
				<Box>Page {page + 1} / {Math.max(1, Math.ceil(total / limit))}</Box>
				<Button size="sm" onClick={() => setPage((p) => (p + 1) < Math.ceil(total / limit) ? p + 1 : p)} isDisabled={(page + 1) >= Math.ceil(total / limit)}>Siguiente</Button>
			</HStack>

			<Modal isOpen={isOpen} onClose={onClose} size="2xl">
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Detalle</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<pre style={{ whiteSpace: 'pre-wrap' }}>{selected ? jsonDiff(selected.beforeJson, selected.afterJson) : ''}</pre>
					</ModalBody>
				</ModalContent>
			</Modal>
		</Box>
	);
}