import { Box, Heading, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';

export function AdminPage() {
	return (
		<Box>
			<Heading size="lg" mb={4}>Administración</Heading>
			<Tabs>
				<TabList>
					<Tab>Usuarios</Tab>
					<Tab>Roles</Tab>
					<Tab>Conexiones</Tab>
					<Tab>Scripts</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Listado de usuarios (pendiente)</TabPanel>
					<TabPanel>Gestión de roles (pendiente)</TabPanel>
					<TabPanel>CRUD de conexiones (pendiente)</TabPanel>
					<TabPanel>Registro y versionado de scripts (pendiente)</TabPanel>
				</TabPanels>
			</Tabs>
		</Box>
	);
}