'use client';

import { AuthProvider } from '../lib/AuthContext';
import AuthModal from './AuthModal';
import PaintUnstick from './PaintUnstick';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <PaintUnstick />
      {children}
      <AuthModal />
    </AuthProvider>
  );
}
