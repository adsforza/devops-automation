import { Box, Container, Flex, Heading, HStack, Link, Spacer, useColorMode, IconButton, Button } from '@chakra-ui/react';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import { api } from '../lib/api';

export function MainLayout() {
	const { colorMode, toggleColorMode } = useColorMode();
	return (
		<Flex minH="100vh" direction="column">
			<Box as="header" borderBottomWidth="1px" py={3}>
				<Container maxW="6xl">
					<Flex align="center" gap={6}>
						<Heading size="md">Automation UI</Heading>
						<HStack as="nav" spacing={4}>
							<Link as={RouterLink} to="/">Dashboard</Link>
							<Link as={RouterLink} to="/execute">Ejecutar</Link>
							<Link as={RouterLink} to="/admin">Admin</Link>
							<Link as={RouterLink} to="/audit">Auditoría</Link>
						</HStack>
						<Spacer />
						<HStack>
							<Button size="sm" variant="outline" onClick={() => api.post('/auth/login')}>Login</Button>
							<Button size="sm" onClick={() => api.post('/auth/logout')}>Logout</Button>
							<IconButton aria-label="toggle theme" variant="ghost" onClick={toggleColorMode} icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />} />
						</HStack>
					</Flex>
				</Container>
			</Box>
			<Box as="main" py={6} flex="1">
				<Container maxW="6xl">
					<Outlet />
				</Container>
			</Box>
		</Flex>
	);
}