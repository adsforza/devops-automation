import { Badge, Box, Card, CardBody, CardHeader, Heading, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { listExecutions } from '../../lib/api';

export function DashboardPage() {
	const { data: executions } = useQuery({ queryKey: ['executions', 'recent'], queryFn: listExecutions });
	const total = executions?.length || 0;
	return (
		<Box>
			<Heading size="lg" mb={4}>Dashboard</Heading>
			<SimpleGrid columns={[1, 2, 4]} spacing={4} mb={6}>
				<Card><CardHeader><Stat><StatLabel>Ejecuciones recientes</StatLabel><StatNumber>{total}</StatNumber><StatHelpText>p95 &lt; 2s</StatHelpText></Stat></CardHeader></Card>
				<Card><CardHeader><Stat><StatLabel>Conexiones</StatLabel><StatNumber>-</StatNumber><StatHelpText><Badge colorScheme="green">OK</Badge></StatHelpText></Stat></CardHeader></Card>
				<Card><CardHeader><Stat><StatLabel>Scripts</StatLabel><StatNumber>-</StatNumber><StatHelpText>activos</StatHelpText></Stat></CardHeader></Card>
				<Card><CardHeader><Stat><StatLabel>Alertas</StatLabel><StatNumber>0</StatNumber><StatHelpText>últimas 24h</StatHelpText></Stat></CardHeader></Card>
			</SimpleGrid>
			<Card>
				<CardHeader><Heading size="md">Ejecuciones recientes</Heading></CardHeader>
				<CardBody>
					<Table size="sm">
						<Thead><Tr><Th>ID</Th><Th>Estado</Th><Th>Inicio</Th></Tr></Thead>
						<Tbody>
							{(executions || []).map((e: any) => (
								<Tr key={e.id}><Td>{e.id}</Td><Td>{e.status}</Td><Td>{new Date(e.startedAt).toLocaleString()}</Td></Tr>
							))}
							{total === 0 && <Tr><Td colSpan={3}>Sin datos</Td></Tr>}
						</Tbody>
					</Table>
				</CardBody>
			</Card>
		</Box>
	);
}