import { Box, Button, FormControl, FormLabel, HStack, Heading, Input, Select, Table, Tbody, Td, Th, Thead, Tr, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { listAuditPaged } from '../../lib/api';
import { useMemo, useState } from 'react';

export function AuditPage() {
	const [filters, setFilters] = useState<{ userId?: string; action?: string; resourceType?: string; resourceId?: string }>({});
	const [page, setPage] = useState(0);
	const limit = 10;
	const { data } = useQuery({ queryKey: ['audit', filters, page], queryFn: () => listAuditPaged({ ...filters, limit, offset: page * limit }) });
	const items = data?.items || [];
	const total = data?.total || 0;
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [selected, setSelected] = useState<any | null>(null);

	function exportJson() {
		const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = 'audit.json'; a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<Box>
			<Heading size="lg" mb={4}>Auditoría</Heading>
			<HStack spacing={4} mb={4}>
				<FormControl maxW="xs"><FormLabel>Usuario</FormLabel><Input value={filters.userId || ''} onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })} /></FormControl>
				<FormControl maxW="xs"><FormLabel>Acción</FormLabel><Input value={filters.action || ''} onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })} /></FormControl>
				<FormControl maxW="xs"><FormLabel>Recurso</FormLabel><Input value={filters.resourceType || ''} onChange={(e) => setFilters({ ...filters, resourceType: e.target.value || undefined })} placeholder="script|user|database-connection" /></FormControl>
				<FormControl maxW="xs"><FormLabel>Recurso ID</FormLabel><Input value={filters.resourceId || ''} onChange={(e) => setFilters({ ...filters, resourceId: e.target.value || undefined })} /></FormControl>
				<Button onClick={() => setPage(0)} colorScheme="blue">Buscar</Button>
				<Button onClick={exportJson}>Exportar JSON</Button>
			</HStack>
			<Table size="sm">
				<Thead><Tr><Th>Fecha</Th><Th>Acción</Th><Th>Recurso</Th><Th>Usuario</Th></Tr></Thead>
				<Tbody>
					{items.map((a: any) => (
						<Tr key={a.id} onClick={() => { setSelected(a); onOpen(); }} style={{ cursor: 'pointer' }}>
							<Td>{new Date(a.eventTime).toLocaleString()}</Td>
							<Td>{a.action}</Td>
							<Td>{a.resourceType}:{a.resourceId}</Td>
							<Td>{a.userId || '-'}</Td>
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

			<Modal isOpen={isOpen} onClose={onClose} size="xl">
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Detalle</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<pre style={{ whiteSpace: 'pre-wrap' }}>{selected ? JSON.stringify(selected, null, 2) : ''}</pre>
					</ModalBody>
				</ModalContent>
			</Modal>
		</Box>
	);
}