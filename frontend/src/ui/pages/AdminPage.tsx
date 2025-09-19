import { Box, Button, FormControl, FormLabel, Heading, Input, Select, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast, IconButton } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listRoles, listUsers, updateUser } from '../../lib/api';
import { useMemo, useState } from 'react';
import { DeleteIcon } from '@chakra-ui/icons';

export function AdminPage() {
	const toast = useToast();
	const qc = useQueryClient();
	const { data: users } = useQuery({ queryKey: ['users'], queryFn: listUsers });
	const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: listRoles });
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const createMut = useMutation({ mutationFn: createUser, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario creado', status: 'success' }); setEmail(''); setName(''); setSelectedRoleIds([]); } });
	const updateMut = useMutation({ mutationFn: ({ id, payload }: any) => updateUser(id, payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario actualizado', status: 'success' }); } });
	const deleteMut = useMutation({ mutationFn: (id: string) => deleteUser(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario eliminado', status: 'success' }); } });

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
								<FormLabel>Roles</FormLabel>
								<Select multiple value={selectedRoleIds} onChange={(e) => setSelectedRoleIds(Array.from(e.target.selectedOptions).map(o => o.value))}>
									{(roles || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
								</Select>
							</FormControl>
							<Button colorScheme="blue" onClick={() => createMut.mutate({ email, displayName: name, roleIds: selectedRoleIds })} isLoading={createMut.isPending}>Crear</Button>
						</HStack>
						<Table size="sm">
							<Thead><Tr><Th>Email</Th><Th>Nombre</Th><Th>Roles</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{(users || []).map((u: any) => (
									<Tr key={u.id}>
										<Td>{u.email}</Td>
										<Td>
											<Input size="sm" defaultValue={u.displayName} onBlur={(e) => updateMut.mutate({ id: u.id, payload: { displayName: e.target.value } })} />
										</Td>
										<Td>
											<Select size="sm" multiple defaultValue={(u.roles || []).map((r: any) => r.roleId)} onChange={(e) => updateMut.mutate({ id: u.id, payload: { roleIds: Array.from(e.target.selectedOptions).map(o => o.value) } })}>
												{(roles || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
											</Select>
										</Td>
										<Td><IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => deleteMut.mutate(u.id)} /></Td>
									</Tr>
								))}
								{(!users || users.length === 0) && <Tr><Td colSpan={4}>Sin usuarios</Td></Tr>}
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