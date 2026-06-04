import { useState, useEffect, useCallback } from 'react';
import { Card, Title, Text, Button, TextInput, SearchSelect, SearchSelectItem, Flex } from '@tremor/react';
import { getSession } from 'next-auth/react';
import DeviceCredentialAdmin from '../../components/DeviceCredentialAdmin';

interface DeviceWithCredentialStatus {
  _id: string;
  miner_key: string;
  name: string;
  order: string;
  email: string;
  category?: string;
  hasCredentials: boolean;
}

export default function AdminCredentialsPage() {
  const [devices, setDevices] = useState<DeviceWithCredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedMinerKey, setSelectedMinerKey] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch('/api/admin/credentials?' + params.toString());
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Device Credentials</Title>
      <Text className="text-gray-300 mt-2">Manage device credentials and find devices missing credentials.</Text>

      <Flex className="mt-6 gap-4" alignItems="end">
        <div className="flex-1">
          <TextInput
            placeholder="Search by miner key..."
            value={search}
            onValueChange={(value) => setSearch(value)}
          />
        </div>
        <div className="w-48">
          <SearchSelect
            placeholder="Filter by category"
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value)}
          >
            <SearchSelectItem value="all">All</SearchSelectItem>
            <SearchSelectItem value="air">Air</SearchSelectItem>
            <SearchSelectItem value="weather">Weather</SearchSelectItem>
            <SearchSelectItem value="energy">Energy</SearchSelectItem>
            <SearchSelectItem value="water">Water</SearchSelectItem>
            <SearchSelectItem value="radiation">Radiation</SearchSelectItem>
            <SearchSelectItem value="camera">Camera</SearchSelectItem>
          </SearchSelect>
        </div>
        <Button onClick={fetchDevices} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </Flex>

      <Card className="mt-6 bg-gray-900 border-gray-700">
        {devices.length === 0 && !loading && (
          <Text className="text-gray-400">No devices found matching your criteria.</Text>
        )}
        <div className="space-y-4">
          {devices.map((device) => (
            <div key={device._id} className="border border-gray-700 rounded-md p-4">
              <Flex alignItems="center" justifyContent="between">
                <div>
                  <Text className="text-white font-medium">{device.name}</Text>
                  <Text className="text-gray-400 text-sm">Key: {device.miner_key}</Text>
                  <Text className="text-gray-400 text-sm">Email: {device.email}</Text>
                  <Text className="text-gray-400 text-sm">Order: {device.order}</Text>
                  {device.category && <Text className="text-gray-400 text-sm">Category: {device.category}</Text>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${device.hasCredentials ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {device.hasCredentials ? 'Credentials saved' : 'Missing credentials'}
                  </span>
                  <Button size="xs" onClick={() => setSelectedMinerKey(selectedMinerKey === device.miner_key ? null : device.miner_key)}>
                    {selectedMinerKey === device.miner_key ? 'Hide' : 'Edit'}
                  </Button>
                </div>
              </Flex>
              {selectedMinerKey === device.miner_key && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <DeviceCredentialAdmin minerKey={device.miner_key} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.admin) {
    return { props: { error: 'Unauthorized access' } };
  }
  return { props: {} };
}
