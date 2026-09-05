import AstronautDatabase from './AstronautDatabase';
import RequireAuth from '../components/RequireAuth';

export default function AstronautDatabasePage() {
  return (
    <RequireAuth>
      <AstronautDatabase />
    </RequireAuth>
  );
}
