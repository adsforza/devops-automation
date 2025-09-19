import { Box, Button, FormControl, FormLabel, Heading, Input, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, HStack, useToast, IconButton, Badge, Checkbox, CheckboxGroup, Wrap, WrapItem, Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody, PopoverArrow, PopoverCloseButton } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listRoles, listUsersPaged, updateUser, updateUserStatus } from '../../lib/api';
import { useState } from 'react';
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
	const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: listRoles });
	const { data } = useQuery({ queryKey: ['users', page], queryFn: () => listUsersPaged({ limit, offset: page * limit }) });
	const users = data?.items || [];
	const total = data?.total || 0;
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const invalidateUsers = () => qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'users' });

	const createMut = useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			invalidateUsers();
			setPage(0);
			toast({ title: 'Usuario creado', status: 'success' });
			setEmail('');
			setName('');
			setSelectedRoleIds([]);
		},
	});
	const updateMut = useMutation({
		mutationFn: ({ id, payload }: any) => updateUser(id, payload),
		onSuccess: () => {
			invalidateUsers();
			toast({ title: 'Usuario actualizado', status: 'success' });
		},
	});
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteUser(id),
		onSuccess: () => {
			invalidateUsers();
			toast({ title: 'Usuario eliminado', status: 'success' });
		},
	});
	const statusMut = useMutation({
		mutationFn: ({ id, status }: any) => updateUserStatus(id, status),
		onSuccess: () => {
			invalidateUsers();
			toast({ title: 'Estado actualizado', status: 'success' });
		},
	});

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
							<FormControl>
								<FormLabel>Roles</FormLabel>
								<CheckboxGroup value={selectedRoleIds} onChange={(v) => setSelectedRoleIds(v as string[])}>
									<Wrap>
										{(roles || []).map((r: any) => (
											<WrapItem key={r.id}><Checkbox value={r.id}>{r.name}</Checkbox></WrapItem>
										))}
									</Wrap>
								</CheckboxGroup>
							</FormControl>
							<Button colorScheme="blue" onClick={() => createMut.mutate({ email, displayName: name, roleIds: selectedRoleIds })} isLoading={createMut.isPending}>Crear</Button>
						</HStack>
						<Table size="sm">
							<Thead><Tr><Th>Email</Th><Th>Nombre</Th><Th>Estado</Th><Th>Roles</Th><Th>Acciones</Th></Tr></Thead>
							<Tbody>
								{users.map((u: any) => {
									const currentRoleIds = (u.roles || []).map((r: any) => r.roleId);
									return (
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
												<RolesPopoverEditor roles={roles || []} value={currentRoleIds} onChange={(roleIds) => updateMut.mutate({ id: u.id, payload: { roleIds } })} />
											</Td>
											<Td><IconButton aria-label="Eliminar" size="sm" colorScheme="red" icon={<DeleteIcon />} onClick={() => deleteMut.mutate(u.id)} /></Td>
										</Tr>
								);
								})}
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