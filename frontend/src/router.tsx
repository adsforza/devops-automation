import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './ui/MainLayout';
import { DashboardPage } from './ui/pages/DashboardPage';
import { ExecutePage } from './ui/pages/ExecutePage';
import { AdminPage } from './ui/pages/AdminPage';
import { AuditPage } from './ui/pages/AuditPage';
import { ChangesPage } from './ui/pages/ChangesPage';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <MainLayout />,
		children: [
			{ index: true, element: <DashboardPage /> },
			{ path: 'execute', element: <ExecutePage /> },
			{ path: 'admin', element: <AdminPage /> },
			{ path: 'audit', element: <AuditPage /> },
			{ path: 'changes', element: <ChangesPage /> },
		],
	},
]);