import { Box, Button, FormControl, FormLabel, Heading, Input, Select, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast, IconButton, Badge } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listRoles, listUsersPaged, updateUser, updateUserStatus } from '../../lib/api';
import { useState } from 'react';
import { DeleteIcon } from '@chakra-ui/icons';

export function AdminPage() {
	const toast = useToast();
	const qc = useQueryClient();
	const [page, setPage] = useState(0);
	const limit = 10;
	const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: listRoles });
	const { data } = useQuery({ queryKey: ['users', page], queryFn: () => listUsersPaged({ limit, offset: page * limit }) });
	const users = data?.items || [];
	const total = data?.total || 0;
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const createMut = useMutation({ mutationFn: createUser, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario creado', status: 'success' }); setEmail(''); setName(''); setSelectedRoleIds([]); } });
	const updateMut = useMutation({ mutationFn: ({ id, payload }: any) => updateUser(id, payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario actualizado', status: 'success' }); } });
	const deleteMut = useMutation({ mutationFn: (id: string) => deleteUser(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuario eliminado', status: 'success' }); } });
	const statusMut = useMutation({ mutationFn: ({ id, status }: any) => updateUserStatus(id, status), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', page] }); } });

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
							<Thead><Tr><Th>Email</Th><Th>Nombre</Th><Th>Estado</Th><Th>Roles</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{users.map((u: any) => (
									<Tr key={u.id}>
										<Td>{u.email}</Td>
										<Td>
											<Input size="sm" defaultValue={u.displayName} onBlur={(e) => updateMut.mutate({ id: u.id, payload: { displayName: e.target.value } })} />
										</Td>
										<Td>{u.status === 'active' ? <Badge colorScheme="green">Activo</Badge> : <Badge>Desactivado</Badge>}
											<Button size="xs" ml={2} onClick={() => statusMut.mutate({ id: u.id, status: u.status === 'active' ? 'disabled' : 'active' })}>
												{u.status === 'active' ? 'Desactivar' : 'Activar'}
											</Button>
										</Td>
										<Td>
											<Select size="sm" multiple defaultValue={(u.roles || []).map((r: any) => r.roleId)} onChange={(e) => updateMut.mutate({ id: u.id, payload: { roleIds: Array.from(e.target.selectedOptions).map(o => o.value) } })}>
												{(roles || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
											</Select>
										</Td>
										<Td><IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => deleteMut.mutate(u.id)} /></Td>
									</Tr>
								))}
								{users.length === 0 && <Tr><Td colSpan={5}>Sin usuarios</Td></Tr>}
							</Tbody>
						</Table>
						<HStack mt={4} justify="flex-end">
							<Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} isDisabled={page === 0}>Anterior</Button>
							<Box>Page {page + 1} / {Math.max(1, Math.ceil(total / limit))}</Box>
							<Button size="sm" onClick={() => setPage((p) => (p + 1) < Math.ceil(total / limit) ? p + 1 : p)} isDisabled={(page + 1) >= Math.ceil(total / limit)}>Siguiente</Button>
						</HStack>
					</TabPanel>
					<TabPanel>Gestión de roles (pendiente)</TabPanel>
					<TabPanel>CRUD de conexiones (pendiente)</TabPanel>
					<TabPanel>Registro y versionado de scripts (pendiente)</TabPanel>
				</TabPanels>
			</Tabs>
		</Box>
	);
}