import SpacecraftDatabase from './SpacecraftDatabase';
import RequireAuth from '../components/RequireAuth';

export default function SpacecraftDatabasePage() {
  return (
    <RequireAuth>
      <SpacecraftDatabase />
    </RequireAuth>
  );
}
