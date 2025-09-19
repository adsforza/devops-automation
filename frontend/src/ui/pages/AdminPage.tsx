import { Box, Button, FormControl, FormLabel, Heading, Input, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast, IconButton, Badge, Checkbox, CheckboxGroup, Wrap, WrapItem, Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody, PopoverArrow, PopoverCloseButton, Select, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, FormErrorMessage, Text } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listRoles, listUsersPaged, updateUser, updateUserStatus, rolesListAll, rolesCreate, rolesUpdate, rolesDelete, listConnections, createConnection, updateConnection, deleteConnection, testConnection } from '../../lib/api';
import { useRef, useState } from 'react';
import { DeleteIcon, EditIcon } from '@chakra-ui/icons';

function RolesPopoverEditor({ roles, value, onChange, isDisabled }: { roles: any[]; value: string[]; onChange: (v: string[]) => void; isDisabled?: boolean }) {
	return (
		<Popover placement="bottom-start" isLazy>
			<PopoverTrigger>
				<Button size="xs" variant="outline" isDisabled={isDisabled}>Roles ({value.length})</Button>
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

	// Edit mode state for users
	const [editingUserId, setEditingUserId] = useState<string | null>(null);
	const [editedUser, setEditedUser] = useState<{ displayName: string; roleIds: string[]; status: 'active' | 'disabled' } | null>(null);

	const createMut = useMutation({ mutationFn: createUser, onSuccess: () => { invalidateUsers(); setPage(0); toast({ title: 'Usuario creado', status: 'success' }); setEmail(''); setName(''); setSelectedRoleIds([]); setEmailError(null); setNameError(null); }, onError: (e: any) => toast({ title: 'Error al crear usuario', description: e?.message, status: 'error' }) });
	const updateMut = useMutation({ mutationFn: ({ id, payload }: any) => updateUser(id, payload), onSuccess: () => { invalidateUsers(); toast({ title: 'Usuario actualizado', status: 'success' }); setEditingUserId(null); setEditedUser(null); } });

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

	const statusMut = useMutation({ mutationFn: ({ id, status }: any) => updateUserStatus(id, status), onSuccess: () => { invalidateUsers(); toast({ title: 'Estado actualizado', status: 'success' }); if (editedUser) setEditedUser({ ...editedUser, status: editedUser.status === 'active' ? 'disabled' : 'active' }); } });

	// Roles CRUD + edit mode
	const { data: rolesAll } = useQuery({ queryKey: ['roles-all'], queryFn: rolesListAll });
	const rolesCreateMut = useMutation({ mutationFn: rolesCreate, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles-all'] }); toast({ title: 'Rol creado', status: 'success' }); setNewRoleName(''); setNewRoleDesc(''); } });
	const rolesUpdateMut = useMutation({ mutationFn: ({ id, payload }: any) => rolesUpdate(id, payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles-all'] }); toast({ title: 'Rol actualizado', status: 'success' }); setEditingRoleId(null); setEditedRole(null); } });
	const [newRoleName, setNewRoleName] = useState('');
	const [newRoleDesc, setNewRoleDesc] = useState('');
	const [roleNameError, setRoleNameError] = useState<string | null>(null);
	const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
	const [editedRole, setEditedRole] = useState<{ name: string; description?: string } | null>(null);

	// Connections CRUD + edit mode
	const { data: conns } = useQuery({ queryKey: ['connections-all'], queryFn: listConnections });
	const connCreateMut = useMutation({ mutationFn: createConnection, onSuccess: () => { qc.invalidateQueries({ queryKey: ['connections-all'] }); toast({ title: 'Conexión creada', status: 'success' }); setNewConn({ name: '', engine: 'postgres', host: 'localhost', port: 5432, database: 'appdb', username: '', password: '' }); } });
	const connUpdateMut = useMutation({ mutationFn: ({ id, payload }: any) => updateConnection(id, payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['connections-all'] }); toast({ title: 'Conexión actualizada', status: 'success' }); setEditingConnId(null); setEditedConn(null); } });
	const connTestMut = useMutation({ mutationFn: (id: string) => testConnection(id), onSuccess: () => toast({ title: 'Conexión OK', status: 'success' }), onError: () => toast({ title: 'Fallo test', status: 'error' }) });
	const [newConn, setNewConn] = useState<any>({ name: '', engine: 'postgres', host: 'localhost', port: 5432, database: 'appdb', username: '', password: '' });
	const [editingConnId, setEditingConnId] = useState<string | null>(null);
	const [editedConn, setEditedConn] = useState<any | null>(null);

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
						<Table size="sm">
							<Thead><Tr><Th>Email</Th><Th>Nombre</Th><Th>Estado</Th><Th>Roles</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{users.map((u: any) => {
									const currentRoleIds = (u.roles || []).map((r: any) => r.roleId);
									const isEditing = editingUserId === u.id;
									return (
										<Tr key={u.id}>
											<Td>{u.email}</Td>
											<Td>
												{isEditing ? (
													<Input size="sm" value={editedUser?.displayName ?? u.displayName} onChange={(e) => setEditedUser({ displayName: e.target.value, roleIds: editedUser?.roleIds ?? currentRoleIds, status: editedUser?.status ?? u.status })} />
												) : (
													<Text>{u.displayName}</Text>
												)}
											</Td>
											<Td>
												{u.status === 'active' ? <Badge colorScheme="green">Activo</Badge> : <Badge>Desactivado</Badge>}
												{isEditing && (
													<Button size="xs" ml={2} onClick={() => statusMut.mutate({ id: u.id, status: (editedUser?.status ?? u.status) === 'active' ? 'disabled' : 'active' })}>
														{(editedUser?.status ?? u.status) === 'active' ? 'Desactivar' : 'Activar'}
													</Button>
												)}
											</Td>
											<Td>
												<RolesPopoverEditor roles={rolesForUsers || []} value={isEditing ? (editedUser?.roleIds ?? currentRoleIds) : currentRoleIds} onChange={(roleIds) => setEditedUser({ displayName: editedUser?.displayName ?? u.displayName, roleIds, status: editedUser?.status ?? u.status })} isDisabled={!isEditing} />
											</Td>
											<Td>
												{!isEditing ? (
													<HStack>
														<IconButton aria-label="Editar" size="sm" icon={<EditIcon />} onClick={() => { setEditingUserId(u.id); setEditedUser({ displayName: u.displayName, roleIds: currentRoleIds, status: u.status }); }} />
														<IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'user', id: u.id }); setConfirmOpen(true); }} />
													</HStack>
												) : (
													<HStack>
														<Button size="sm" colorScheme="blue" onClick={() => updateMut.mutate({ id: u.id, payload: { displayName: editedUser?.displayName, roleIds: editedUser?.roleIds } })}>Guardar</Button>
														<Button size="sm" variant="ghost" onClick={() => { setEditingUserId(null); setEditedUser(null); }}>Cancelar</Button>
													</HStack>
												)}
											</Td>
										</Tr>
									);
								})}
								{users.length === 0 && <Tr><Td colSpan={5}>Sin usuarios</Td></Tr>}
							</Tbody>
						</Table>
						<HStack mt={4} justify="flex-end"><Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} isDisabled={page === 0}>Anterior</Button><Box>Page {page + 1} / {Math.max(1, Math.ceil(total / limit))}</Box><Button size="sm" onClick={() => setPage((p) => (p + 1) < Math.ceil(total / limit) ? p + 1 : p)} isDisabled={(page + 1) >= Math.ceil(total / limit)}>Siguiente</Button></HStack>
					</TabPanel>
					<TabPanel>
						<HStack mb={4} spacing={4} align="flex-end">
							<FormControl maxW="sm" isInvalid={!!roleNameError}><FormLabel>Nombre</FormLabel><Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} /><FormErrorMessage>{roleNameError}</FormErrorMessage></FormControl>
							<FormControl maxW="md"><FormLabel>Descripción</FormLabel><Input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} /></FormControl>
							<Button colorScheme="blue" onClick={handleCreateRole} isLoading={rolesCreateMut.isPending}>Crear rol</Button>
						</HStack>
						<Table size="sm">
							<Thead><Tr><Th>Nombre</Th><Th>Descripción</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{(rolesAll || []).map((r: any) => {
									const isEditing = editingRoleId === r.id;
									return (
										<Tr key={r.id}>
											<Td>
												{isEditing ? (
													<Input size="sm" value={editedRole?.name ?? r.name} onChange={(e) => setEditedRole({ name: e.target.value, description: editedRole?.description ?? r.description })} />
												) : (
													<Text>{r.name}</Text>
												)}
											</Td>
											<Td>
												{isEditing ? (
													<Input size="sm" value={editedRole?.description ?? (r.description || '')} onChange={(e) => setEditedRole({ name: editedRole?.name ?? r.name, description: e.target.value })} />
												) : (
													<Text>{r.description || '-'}</Text>
												)}
											</Td>
											<Td>
												{!isEditing ? (
													<HStack>
														<IconButton aria-label="Editar" size="sm" icon={<EditIcon />} onClick={() => { setEditingRoleId(r.id); setEditedRole({ name: r.name, description: r.description }); }} />
														<IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'role', id: r.id }); setConfirmOpen(true); }} />
													</HStack>
												) : (
													<HStack>
														<Button size="sm" colorScheme="blue" onClick={() => rolesUpdateMut.mutate({ id: r.id, payload: { name: editedRole?.name, description: editedRole?.description } })}>Guardar</Button>
														<Button size="sm" variant="ghost" onClick={() => { setEditingRoleId(null); setEditedRole(null); }}>Cancelar</Button>
													</HStack>
												)}
											</Td>
										</Tr>
								);
								})}
								{(!rolesAll || rolesAll.length === 0) && <Tr><Td colSpan={3}>Sin roles</Td></Tr>}
							</Tbody>
						</Table>
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
						<Table size="sm">
							<Thead><Tr><Th>Nombre</Th><Th>Engine</Th><Th>Host</Th><Th>DB</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{(conns || []).map((c: any) => {
									const isEditing = editingConnId === c.id;
									return (
										<Tr key={c.id}>
											<Td>
												{isEditing ? (
													<Input size="sm" value={editedConn?.name ?? c.name} onChange={(e) => setEditedConn({ ...(editedConn || {}), name: e.target.value })} />
												) : (<Text>{c.name}</Text>)}
											</Td>
											<Td>{c.engine}</Td>
											<Td>
												{isEditing ? (
													<Input size="sm" value={editedConn?.host ?? c.host} onChange={(e) => setEditedConn({ ...(editedConn || {}), host: e.target.value })} />
												) : (<Text>{c.host}</Text>)}
											</Td>
											<Td>
												{isEditing ? (
													<Input size="sm" value={editedConn?.database ?? c.database} onChange={(e) => setEditedConn({ ...(editedConn || {}), database: e.target.value })} />
												) : (<Text>{c.database}</Text>)}
											</Td>
											<Td>
												{!isEditing ? (
													<HStack>
														<Button size="xs" onClick={() => connTestMut.mutate(c.id)}>Test</Button>
														<IconButton aria-label="Editar" size="sm" icon={<EditIcon />} onClick={() => { setEditingConnId(c.id); setEditedConn({ name: c.name, host: c.host, database: c.database }); }} />
														<IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'conn', id: c.id }); setConfirmOpen(true); }} />
													</HStack>
												) : (
													<HStack>
														<Button size="sm" colorScheme="blue" onClick={() => connUpdateMut.mutate({ id: c.id, payload: editedConn })}>Guardar</Button>
														<Button size="sm" variant="ghost" onClick={() => { setEditingConnId(null); setEditedConn(null); }}>Cancelar</Button>
													</HStack>
												)}
											</Td>
										</Tr>
								);
								})}
								{(!conns || conns.length === 0) && <Tr><Td colSpan={5}>Sin conexiones</Td></Tr>}
							</Tbody>
						</Table>
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