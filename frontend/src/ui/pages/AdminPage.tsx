import { Box, Button, FormControl, FormLabel, Heading, Input, Select, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, listRoles, listUsers } from '../../lib/api';
import { useState } from 'react';

export function AdminPage() {
	const toast = useToast();
	const qc = useQueryClient();
	const { data: users } = useQuery({ queryKey: ['users'], queryFn: listUsers });
	const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: listRoles });
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [roleId, setRoleId] = useState('');
	const mut = useMutation({ mutationFn: createUser, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario creado', status: 'success' }); setEmail(''); setName(''); setRoleId(''); } });

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
					<TabPanel>
						<HStack mb={4} spacing={4} align="flex-end">
							<FormControl maxW="sm">
								<FormLabel>Email</FormLabel>
								<Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
							</FormControl>
							<FormControl maxW="sm">
								<FormLabel>Nombre</FormLabel>
								<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre Apellido" />
							</FormControl>
							<FormControl maxW="sm">
								<FormLabel>Rol</FormLabel>
								<Select placeholder="Selecciona" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
									{(roles || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
								</Select>
							</FormControl>
							<Button colorScheme="blue" onClick={() => mut.mutate({ email, displayName: name, roleIds: roleId ? [roleId] : [] })} isLoading={mut.isPending}>Crear</Button>
						</HStack>
						<Table size="sm">
							<Thead><Tr><Th>Email</Th><Th>Nombre</Th><Th>Estado</Th></Tr></Thead>
							<Tbody>
								{(users || []).map((u: any) => (<Tr key={u.id}><Td>{u.email}</Td><Td>{u.displayName}</Td><Td>{u.status}</Td></Tr>))}
								{(!users || users.length === 0) && <Tr><Td colSpan={3}>Sin usuarios</Td></Tr>}
							</Tbody>
						</Table>
					</TabPanel>
					<TabPanel>Gestión de roles (pendiente)</TabPanel>
					<TabPanel>CRUD de conexiones (pendiente)</TabPanel>
					<TabPanel>Registro y versionado de scripts (pendiente)</TabPanel>
				</TabPanels>
			</Tabs>
		</Box>
	);
}