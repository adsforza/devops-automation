import { Box, Button, FormControl, FormLabel, Heading, Input, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast, IconButton, Badge, Checkbox, CheckboxGroup, Wrap, WrapItem, Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody, PopoverArrow, PopoverCloseButton, Select, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, FormErrorMessage } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listRoles, listUsersPaged, updateUser, updateUserStatus, rolesListAll, rolesCreate, rolesUpdate, rolesDelete, listConnections, createConnection, updateConnection, deleteConnection, testConnection } from '../../lib/api';
import { useRef, useState } from 'react';
import { DeleteIcon } from '@chakra-ui/icons';

function RolesPopoverEditor({ roles, value, onChange }: { roles: any[]; value: string[]; onChange: (v: string[]) => void }) {
	return (
		<Popover placement="bottom-start">
			<PopoverTrigger>
				<Button size="xs" variant="outline">Roles ({value.length})</Button>
			</PopoverTrigger>
			<PopoverContent w="sm">
				<PopoverArrow />
				<PopoverCloseButton />
				<PopoverHeader>Selecciona roles</PopoverHeader>
				<PopoverBody>
					<CheckboxGroup value={value} onChange={(v) => onChange(v as string[])}>
						<Wrap>
							{(roles || []).map((r: any) => (
								<WrapItem key={r.id}>
									<Checkbox value={r.id}>{r.name}</Checkbox>
								</WrapItem>
							))}
						</Wrap>
					</CheckboxGroup>
				</PopoverBody>
			</PopoverContent>
		</Popover>
	);
}

export function AdminPage() {
	const toast = useToast();
	const qc = useQueryClient();
	const [page, setPage] = useState(0);
	const limit = 10;
	const { data: rolesForUsers } = useQuery({ queryKey: ['roles-users'], queryFn: listRoles });
	const { data } = useQuery({ queryKey: ['users', page], queryFn: () => listUsersPaged({ limit, offset: page * limit }) });
	const users = data?.items || [];
	const total = data?.total || 0;
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const invalidateUsers = () => qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'users' });
	const [emailError, setEmailError] = useState<string | null>(null);
	const [nameError, setNameError] = useState<string | null>(null);

	const createMut = useMutation({ mutationFn: createUser, onSuccess: () => { invalidateUsers(); setPage(0); toast({ title: 'Usuario creado', status: 'success' }); setEmail(''); setName(''); setSelectedRoleIds([]); setEmailError(null); setNameError(null); }, onError: (e: any) => toast({ title: 'Error al crear usuario', description: e?.message, status: 'error' }) });
	const updateMut = useMutation({ mutationFn: ({ id, payload }: any) => updateUser(id, payload), onSuccess: () => { invalidateUsers(); toast({ title: 'Usuario actualizado', status: 'success' }); } });

	// Delete confirmation state
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmItem, setConfirmItem] = useState<{ type: 'user' | 'role' | 'conn'; id: string } | null>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);
	const deleteMut = useMutation({ mutationFn: async () => {
		if (!confirmItem) return;
		if (confirmItem.type === 'user') await deleteUser(confirmItem.id);
		if (confirmItem.type === 'role') await rolesDelete(confirmItem.id);
		if (confirmItem.type === 'conn') await deleteConnection(confirmItem.id);
	}, onSuccess: () => {
		qc.invalidateQueries({ queryKey: ['users'] });
		qc.invalidateQueries({ queryKey: ['roles-all'] });
		qc.invalidateQueries({ queryKey: ['connections-all'] });
		toast({ title: 'Eliminado', status: 'success' });
		setConfirmOpen(false);
		setConfirmItem(null);
	} });

	const statusMut = useMutation({ mutationFn: ({ id, status }: any) => updateUserStatus(id, status), onSuccess: () => { invalidateUsers(); toast({ title: 'Estado actualizado', status: 'success' }); } });

	// Roles CRUD
	const { data: rolesAll } = useQuery({ queryKey: ['roles-all'], queryFn: rolesListAll });
	const rolesCreateMut = useMutation({ mutationFn: rolesCreate, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles-all'] }); toast({ title: 'Rol creado', status: 'success' }); } });
	const rolesUpdateMut = useMutation({ mutationFn: ({ id, payload }: any) => rolesUpdate(id, payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles-all'] }); toast({ title: 'Rol actualizado', status: 'success' }); } });
	const [newRoleName, setNewRoleName] = useState('');
	const [newRoleDesc, setNewRoleDesc] = useState('');
	const [roleNameError, setRoleNameError] = useState<string | null>(null);

	// Connections CRUD
	const { data: conns } = useQuery({ queryKey: ['connections-all'], queryFn: listConnections });
	const connCreateMut = useMutation({ mutationFn: createConnection, onSuccess: () => { qc.invalidateQueries({ queryKey: ['connections-all'] }); toast({ title: 'Conexión creada', status: 'success' }); } });
	const connUpdateMut = useMutation({ mutationFn: ({ id, payload }: any) => updateConnection(id, payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['connections-all'] }); toast({ title: 'Conexión actualizada', status: 'success' }); } });
	const connTestMut = useMutation({ mutationFn: (id: string) => testConnection(id), onSuccess: () => toast({ title: 'Conexión OK', status: 'success' }), onError: () => toast({ title: 'Fallo test', status: 'error' }) });
	const [newConn, setNewConn] = useState<any>({ name: '', engine: 'postgres', host: 'localhost', port: 5432, database: 'appdb', username: '', password: '' });

	function handleCreateUser() {
		let ok = true;
		if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setEmailError('Email inválido'); ok = false; } else { setEmailError(null); }
		if (!name) { setNameError('Nombre requerido'); ok = false; } else { setNameError(null); }
		if (!ok) return;
		createMut.mutate({ email, displayName: name, roleIds: selectedRoleIds });
	}

	function handleCreateRole() {
		if (!newRoleName || newRoleName.length < 3) { setRoleNameError('Nombre de rol mínimo 3 caracteres'); return; }
		setRoleNameError(null);
		rolesCreateMut.mutate({ name: newRoleName, description: newRoleDesc });
	}

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
							<FormControl maxW="sm" isInvalid={!!emailError}><FormLabel>Email</FormLabel><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" /><FormErrorMessage>{emailError}</FormErrorMessage></FormControl>
							<FormControl maxW="sm" isInvalid={!!nameError}><FormLabel>Nombre</FormLabel><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre Apellido" /><FormErrorMessage>{nameError}</FormErrorMessage></FormControl>
							<FormControl><FormLabel>Roles</FormLabel><CheckboxGroup value={selectedRoleIds} onChange={(v) => setSelectedRoleIds(v as string[])}><Wrap>{(rolesForUsers || []).map((r: any) => (<WrapItem key={r.id}><Checkbox value={r.id}>{r.name}</Checkbox></WrapItem>))}</Wrap></CheckboxGroup></FormControl>
							<Button colorScheme="blue" onClick={handleCreateUser} isLoading={createMut.isPending}>Crear</Button>
						</HStack>
						<Table size="sm"><Thead><Tr><Th>Email</Th><Th>Nombre</Th><Th>Estado</Th><Th>Roles</Th><Th>Acciones</Th></Tr></Thead><Tbody>{users.map((u: any) => { const currentRoleIds = (u.roles || []).map((r: any) => r.roleId); return (<Tr key={u.id}><Td>{u.email}</Td><Td><Input size="sm" defaultValue={u.displayName} onBlur={(e) => updateMut.mutate({ id: u.id, payload: { displayName: e.target.value } })} /></Td><Td>{u.status === 'active' ? <Badge colorScheme="green">Activo</Badge> : <Badge>Desactivado</Badge>}<Button size="xs" ml={2} onClick={() => statusMut.mutate({ id: u.id, status: u.status === 'active' ? 'disabled' : 'active' })}>{u.status === 'active' ? 'Desactivar' : 'Activar'}</Button></Td><Td><RolesPopoverEditor roles={rolesForUsers || []} value={currentRoleIds} onChange={(roleIds) => updateMut.mutate({ id: u.id, payload: { roleIds } })} /></Td><Td><IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'user', id: u.id }); setConfirmOpen(true); }} /></Td></Tr>); })}{users.length === 0 && <Tr><Td colSpan={5}>Sin usuarios</Td></Tr>}</Tbody></Table>
						<HStack mt={4} justify="flex-end"><Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} isDisabled={page === 0}>Anterior</Button><Box>Page {page + 1} / {Math.max(1, Math.ceil(total / limit))}</Box><Button size="sm" onClick={() => setPage((p) => (p + 1) < Math.ceil(total / limit) ? p + 1 : p)} isDisabled={(page + 1) >= Math.ceil(total / limit)}>Siguiente</Button></HStack>
					</TabPanel>
					<TabPanel>
						<HStack mb={4} spacing={4} align="flex-end">
							<FormControl maxW="sm" isInvalid={!!roleNameError}><FormLabel>Nombre</FormLabel><Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} /><FormErrorMessage>{roleNameError}</FormErrorMessage></FormControl>
							<FormControl maxW="md"><FormLabel>Descripción</FormLabel><Input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} /></FormControl>
							<Button colorScheme="blue" onClick={handleCreateRole} isLoading={rolesCreateMut.isPending}>Crear rol</Button>
						</HStack>
						<Table size="sm"><Thead><Tr><Th>Nombre</Th><Th>Descripción</Th><Th>Acciones</Th></Tr></Thead><Tbody>{(rolesAll || []).map((r: any) => (<Tr key={r.id}><Td><Input size="sm" defaultValue={r.name} onBlur={(e) => rolesUpdateMut.mutate({ id: r.id, payload: { name: e.target.value } })} /></Td><Td><Input size="sm" defaultValue={r.description || ''} onBlur={(e) => rolesUpdateMut.mutate({ id: r.id, payload: { description: e.target.value } })} /></Td><Td><IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'role', id: r.id }); setConfirmOpen(true); }} /></Td></Tr>))}{(!rolesAll || rolesAll.length === 0) && <Tr><Td colSpan={3}>Sin roles</Td></Tr>}</Tbody></Table>
					</TabPanel>
					<TabPanel>
						<HStack mb={4} spacing={4} align="flex-end">
							<FormControl maxW="sm"><FormLabel>Nombre</FormLabel><Input value={newConn.name} onChange={(e) => setNewConn({ ...newConn, name: e.target.value })} /></FormControl>
							<FormControl maxW="sm"><FormLabel>Engine</FormLabel><Select value={newConn.engine} onChange={(e) => setNewConn({ ...newConn, engine: e.target.value })}><option value="postgres">PostgreSQL</option><option value="mysql">MySQL</option><option value="sqlserver">SQL Server</option><option value="oracle">Oracle</option></Select></FormControl>
							<FormControl maxW="sm"><FormLabel>Host</FormLabel><Input value={newConn.host} onChange={(e) => setNewConn({ ...newConn, host: e.target.value })} /></FormControl>
							<FormControl maxW="sm"><FormLabel>Port</FormLabel><Input type="number" value={newConn.port} onChange={(e) => setNewConn({ ...newConn, port: Number(e.target.value) })} /></FormControl>
							<FormControl maxW="sm"><FormLabel>DB</FormLabel><Input value={newConn.database} onChange={(e) => setNewConn({ ...newConn, database: e.target.value })} /></FormControl>
							<FormControl maxW="sm"><FormLabel>User</FormLabel><Input value={newConn.username} onChange={(e) => setNewConn({ ...newConn, username: e.target.value })} /></FormControl>
							<FormControl maxW="sm"><FormLabel>Password</FormLabel><Input type="password" value={newConn.password} onChange={(e) => setNewConn({ ...newConn, password: e.target.value })} /></FormControl>
							<Button colorScheme="blue" onClick={() => connCreateMut.mutate(newConn)} isLoading={connCreateMut.isPending}>Crear conexión</Button>
						</HStack>
						<Table size="sm"><Thead><Tr><Th>Nombre</Th><Th>Engine</Th><Th>Host</Th><Th>DB</Th><Th>Acciones</Th></Tr></Thead><Tbody>{(conns || []).map((c: any) => (<Tr key={c.id}><Td><Input size="sm" defaultValue={c.name} onBlur={(e) => connUpdateMut.mutate({ id: c.id, payload: { name: e.target.value } })} /></Td><Td>{c.engine}</Td><Td><Input size="sm" defaultValue={c.host} onBlur={(e) => connUpdateMut.mutate({ id: c.id, payload: { host: e.target.value } })} /></Td><Td><Input size="sm" defaultValue={c.database} onBlur={(e) => connUpdateMut.mutate({ id: c.id, payload: { database: e.target.value } })} /></Td><Td><HStack><Button size="xs" onClick={() => connTestMut.mutate(c.id)}>Test</Button><IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'conn', id: c.id }); setConfirmOpen(true); }} /></HStack></Td></Tr>))}{(!conns || conns.length === 0) && <Tr><Td colSpan={5}>Sin conexiones</Td></Tr>}</Tbody></Table>
					</TabPanel>
					<TabPanel>Registro y versionado de scripts (pendiente)</TabPanel>
				</TabPanels>
			</Tabs>

			<AlertDialog isOpen={confirmOpen} leastDestructiveRef={cancelRef} onClose={() => setConfirmOpen(false)}>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader>Confirmar borrado</AlertDialogHeader>
						<AlertDialogBody>Esta acción no se puede deshacer. ¿Deseas continuar?</AlertDialogBody>
						<AlertDialogFooter>
							<Button ref={cancelRef} onClick={() => setConfirmOpen(false)}>Cancelar</Button>
							<Button colorScheme="red" ml={3} onClick={() => deleteMut.mutate()} isLoading={deleteMut.isPending}>Borrar</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
		</Box>
	);
}