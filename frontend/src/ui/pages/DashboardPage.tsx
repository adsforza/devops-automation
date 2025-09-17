import { Badge, Box, Card, CardBody, CardHeader, Grid, GridItem, Heading, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';

export function DashboardPage() {
	return (
		<Box>
			<Heading size="lg" mb={4}>Dashboard</Heading>
			<SimpleGrid columns={[1, 2, 4]} spacing={4} mb={6}>
				<Card><CardHeader><Stat><StatLabel>Ejecuciones hoy</StatLabel><StatNumber>0</StatNumber><StatHelpText>p95 &lt; 2s</StatHelpText></Stat></CardHeader></Card>
				<Card><CardHeader><Stat><StatLabel>Conexiones</StatLabel><StatNumber>0</StatNumber><StatHelpText><Badge colorScheme="green">OK</Badge></StatHelpText></Stat></CardHeader></Card>
				<Card><CardHeader><Stat><StatLabel>Scripts</StatLabel><StatNumber>0</StatNumber><StatHelpText>activos</StatHelpText></Stat></CardHeader></Card>
				<Card><CardHeader><Stat><StatLabel>Alertas</StatLabel><StatNumber>0</StatNumber><StatHelpText>últimas 24h</StatHelpText></Stat></CardHeader></Card>
			</SimpleGrid>
			<Card>
				<CardHeader><Heading size="md">Ejecuciones recientes</Heading></CardHeader>
				<CardBody>
					<Table size="sm">
						<Thead><Tr><Th>ID</Th><Th>Script</Th><Th>Estado</Th><Th>Inicio</Th></Tr></Thead>
						<Tbody>
							<Tr><Td colSpan={4}>Sin datos</Td></Tr>
						</Tbody>
					</Table>
				</CardBody>
			</Card>
		</Box>
	);
}