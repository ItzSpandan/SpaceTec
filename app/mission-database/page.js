import MissionDatabase from './MissionDatabase';
import RequireAuth from '../components/RequireAuth';

export default function MissionDatabasePage() {
  return (
    <RequireAuth>
      <MissionDatabase />
    </RequireAuth>
  );
}
