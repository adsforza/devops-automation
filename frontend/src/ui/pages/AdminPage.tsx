import { Box, Button, FormControl, FormLabel, Heading, Input, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast, IconButton, Badge, Checkbox, CheckboxGroup, Wrap, WrapItem, Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody, PopoverArrow, PopoverCloseButton, Select, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, FormErrorMessage, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listRoles, listUsersPaged, updateUser, updateUserStatus, rolesListAll, rolesCreate, rolesUpdate, rolesDelete, listConnections, createConnection, updateConnection, deleteConnection, testConnection } from '../../lib/api';
import { useRef, useState, useEffect } from 'react';
import { DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { listMetadataTables, listMetadataProcs, rolePermsGet, rolePermsSet } from '../../lib/api';

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
	const { isOpen: isRoleModalOpen, onOpen: onRoleModalOpen, onClose: onRoleModalClose } = useDisclosure();

	function openCreateRoleModal() {
		setEditingRoleId(null);
		setEditedRole({ name: '', description: '' });
		onRoleModalOpen();
	}
	function openEditRoleModal(r: any) {
		setEditingRoleId(r.id);
		setEditedRole({ name: r.name, description: r.description });
		onRoleModalOpen();
	}
	function submitRoleModal() {
		if (!editedRole?.name || editedRole.name.length < 3) { setRoleNameError('Nombre de rol mínimo 3 caracteres'); return; }
		setRoleNameError(null);
		if (editingRoleId) {
			rolesUpdateMut.mutate({ id: editingRoleId, payload: { name: editedRole.name, description: editedRole.description } });
		} else {
			rolesCreateMut.mutate({ name: editedRole!.name, description: editedRole!.description });
		}
		onRoleModalClose();
	}

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
						<HStack mb={4} spacing={4} align="center">
							<Button colorScheme="blue" onClick={openCreateRoleModal}>Nuevo rol</Button>
						</HStack>
						<Table size="sm">
							<Thead><Tr><Th>Nombre</Th><Th>Descripción</Th><Th>Permisos</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{(rolesAll || []).map((r: any) => (
									<Tr key={r.id}>
										<Td>{r.name}</Td>
										<Td>{r.description || '-'}</Td>
										<Td><RolePermsEditorModal roleId={r.id} /></Td>
										<Td>
											<HStack>
												<IconButton aria-label="Editar" size="sm" icon={<EditIcon />} onClick={() => openEditRoleModal(r)} />
												<IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => { setConfirmItem({ type: 'role', id: r.id }); setConfirmOpen(true); }} />
											</HStack>
										</Td>
									</Tr>
								))}
								{(!rolesAll || rolesAll.length === 0) && <Tr><Td colSpan={4}>Sin roles</Td></Tr>}
							</Tbody>
						</Table>

						<Modal isOpen={isRoleModalOpen} onClose={onRoleModalClose} size="lg">
							<ModalOverlay />
							<ModalContent>
								<ModalHeader>{editingRoleId ? 'Editar rol' : 'Nuevo rol'}</ModalHeader>
								<ModalCloseButton />
								<ModalBody>
									<FormControl isInvalid={!!roleNameError} mb={3}>
										<FormLabel>Nombre</FormLabel>
										<Input value={editedRole?.name || ''} onChange={(e) => setEditedRole({ name: e.target.value, description: editedRole?.description })} />
										<FormErrorMessage>{roleNameError}</FormErrorMessage>
									</FormControl>
									<FormControl>
										<FormLabel>Descripción</FormLabel>
										<Input value={editedRole?.description || ''} onChange={(e) => setEditedRole({ name: editedRole?.name || '', description: e.target.value })} />
									</FormControl>
								</ModalBody>
								<ModalFooter>
									<HStack spacing={3}>
										<Button variant="ghost" onClick={onRoleModalClose}>Cancelar</Button>
										<Button colorScheme="blue" onClick={submitRoleModal}>{editingRoleId ? 'Guardar' : 'Crear'}</Button>
									</HStack>
								</ModalFooter>
							</ModalContent>
						</Modal>
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

function RolePermsEditorModal({ roleId }: { roleId: string }) {
	const { isOpen, onOpen, onClose } = useDisclosure();
	return (
		<>
			<Button size="sm" onClick={onOpen}>Editar permisos</Button>
			<Modal isOpen={isOpen} onClose={onClose} size="6xl">
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Permisos del rol</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<RolePermsEditor roleId={roleId} modal onClose={onClose} />
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
}

function RolePermsEditor({ roleId, modal, onClose }: { roleId: string; modal?: boolean; onClose?: () => void }) {
	const toast = useToast();
	const qc = useQueryClient();
	const { data: connections } = useQuery({ queryKey: ['connections-all'], queryFn: listConnections });
	const [connectionId, setConnectionId] = useState<string>('');
	const { data: tables } = useQuery({ queryKey: ['metadata-tables', connectionId], queryFn: () => listMetadataTables(connectionId), enabled: !!connectionId });
	const { data: procs } = useQuery({ queryKey: ['metadata-procs', connectionId], queryFn: () => listMetadataProcs(connectionId), enabled: !!connectionId });
	const { data: current } = useQuery({ queryKey: ['role-perms', roleId, connectionId], queryFn: () => rolePermsGet(roleId, connectionId), enabled: !!connectionId });
	const [tableOps, setTableOps] = useState<Record<string, string[]>>({});
	const [procExec, setProcExec] = useState<Record<string, boolean>>({});
	const [schemaFilter, setSchemaFilter] = useState('');
	const [nameFilter, setNameFilter] = useState('');
	const saveMut = useMutation({ mutationFn: (payload: any) => rolePermsSet(roleId, payload), onSuccess: () => { toast({ title: 'Permisos guardados', status: 'success' }); qc.invalidateQueries({ queryKey: ['role-perms', roleId, connectionId] }); } });

	useEffect(() => {
		if (!current) return;
		const tOps: Record<string, string[]> = {};
		const pExec: Record<string, boolean> = {};
		for (const p of current) {
			const parts = p.resourceId.split('::')[1].split(':');
			const type = parts[0];
			const fqdn = parts.slice(1).join(':');
			if (type === 'table') {
				tOps[fqdn] = [...(tOps[fqdn] || []), p.operation];
			}
			if (type === 'proc') {
				pExec[fqdn] = true;
			}
		}
		setTableOps(tOps);
		setProcExec(pExec);
	}, [current]);

	if (!connections || connections.length === 0) return <Text>Sin conexiones</Text>;

	const filteredTables = (tables || []).filter((t: any) => (!schemaFilter || t.schema.includes(schemaFilter)) && (!nameFilter || t.name.includes(nameFilter)));
	const filteredProcs = (procs || []).filter((p: any) => (!schemaFilter || p.schema.includes(schemaFilter)) && (!nameFilter || p.name.includes(nameFilter)));

	return (
		<Box>
			<HStack mb={2}>
				<FormControl maxW="md"><FormLabel>Conexión</FormLabel><Select value={connectionId} onChange={(e) => setConnectionId(e.target.value)} placeholder="Selecciona"><option key="" value="">Selecciona</option>{connections.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}</Select></FormControl>
				<FormControl maxW="xs"><FormLabel>Esquema</FormLabel><Input value={schemaFilter} onChange={(e) => setSchemaFilter(e.target.value)} placeholder="public" /></FormControl>
				<FormControl maxW="xs"><FormLabel>Nombre</FormLabel><Input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="users" /></FormControl>
				<Button onClick={() => saveMut.mutate({ connectionId, tablePermissions: Object.entries(tableOps).map(([fqdn, ops]) => ({ fqdn, operations: ops })), procPermissions: Object.entries(procExec).map(([fqdn, allowed]) => ({ fqdn, allowed })) })} isDisabled={!connectionId} colorScheme="blue">Guardar permisos</Button>
				{modal && <Button variant="ghost" onClick={onClose}>Cerrar</Button>}
			</HStack>
			{connectionId && (
				<HStack align="start" spacing={8}>
					<Box flex="1">
						<Heading size="sm" mb={2}>Tablas</Heading>
						<Table size="sm"><Thead><Tr><Th>Tabla</Th><Th>Permisos</Th></Tr></Thead><Tbody>{filteredTables.map((t: any) => { const fqdn = t.fqdn; const selected = tableOps[fqdn] || []; const toggle = (op: string) => { const set = new Set(selected); set.has(op) ? set.delete(op) : set.add(op); setTableOps({ ...tableOps, [fqdn]: Array.from(set) }); }; return (<Tr key={fqdn}><Td>{fqdn}</Td><Td><HStack><Checkbox isChecked={selected.includes('INSERT')} onChange={() => toggle('INSERT')}>INSERT</Checkbox><Checkbox isChecked={selected.includes('UPDATE')} onChange={() => toggle('UPDATE')}>UPDATE</Checkbox><Checkbox isChecked={selected.includes('DELETE')} onChange={() => toggle('DELETE')}>DELETE</Checkbox></HStack></Td></Tr>); })}</Tbody></Table>
					</Box>
					<Box flex="1">
						<Heading size="sm" mb={2}>Stored procedures/funciones</Heading>
						<Table size="sm"><Thead><Tr><Th>Nombre</Th><Th>EXECUTE</Th></Tr></Thead><Tbody>{filteredProcs.map((p: any) => { const fqdn = p.fqdn; return (<Tr key={fqdn}><Td>{fqdn}</Td><Td><Checkbox isChecked={!!procExec[fqdn]} onChange={(e) => setProcExec({ ...procExec, [fqdn]: e.target.checked })}>EXECUTE</Checkbox></Td></Tr>); })}</Tbody></Table>
					</Box>
				</HStack>
			)}
		</Box>
	);
}