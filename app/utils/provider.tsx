'use client';
import React from 'react';
import { ProgressProvider } from '@bprogress/next/dist/app';
import { store } from '@/utils/APISlice/store';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import NetworkStatusHandler from '@/components/NetworkStatusHandler';
import { AuthProvider } from './AuthProvider';

interface NewProviderProps {
	children: React.ReactNode;
}

const NewProvider: React.FC<NewProviderProps> = ({ children }) => {
	return (
		<AuthProvider>
			<Toaster
				position="top-right"
				theme="light"
				richColors
				closeButton
				toastOptions={{
					style: { borderRadius: 0 },
				}}
			/>
			<NetworkStatusHandler />
			<ProgressProvider
				height="4px"
				color="#2563EB"
				options={{ showSpinner: false }}
				shallowRouting>
				<Provider store={store}>
					{children}
				</Provider>
			</ProgressProvider>
		</AuthProvider>
	);
}

export default NewProvider;
