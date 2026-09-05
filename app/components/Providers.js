'use client';

import { AuthProvider } from '../lib/AuthContext';
import AuthModal from './AuthModal';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
    </AuthProvider>
  );
}
