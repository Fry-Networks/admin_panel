import { useState, useEffect, useCallback } from 'react';
import { Card, Title, Text } from '@tremor/react';

interface AllowlistEntry {
  _id: string;
  githubUsername: string;
  addedBy: string;
  addedAt: string;
  notes: string;
  enabled: boolean;
}

interface RoleDefinition {
  _id: string;
  name: string;
  description: string;
}

interface WebUser {
  _id: string;
  name: string;
  email: string;
  roles: string[];
}

export default function AllowlistPage() {
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [users, setUsers] = useState<WebUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/allowlist').then((r) => r.json()),
      fetch('/api/roles').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ])
      .then(([alData, roData, usData]) => {
        setEntries(alData.entries || []);
        setRoles(roData.roles || []);
        setUsers(usData.users || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEntry = async () => {
    if (!newUsername.trim()) return;
    setError(null);
    const res = await fetch('/api/allowlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubUsername: newUsername.trim(), notes: newNotes.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || `HTTP ${res.status}`);
      return;
    }
    setNewUsername('');
    setNewNotes('');
    setStatus('Added');
    load();
  };

  const removeEntry = async (id: string) => {
    const res = await fetch(`/api/allowlist/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || `HTTP ${res.status}`);
      return;
    }
    setStatus('Removed');
    load();
  };

  const toggleEntry = async (id: string, enabled: boolean) => {
    const res = await fetch(`/api/allowlist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || `HTTP ${res.status}`);
      return;
    }
    load();
  };

  const updateUserRole = async (userId: string, roleName: string) => {
    const res = await fetch(`/api/users/${userId}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: roleName ? [roleName] : [] }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || `HTTP ${res.status}`);
      return;
    }
    setStatus('Role updated');
    load();
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950">
      <Title className="text-white">GitHub Allowlist & Roles</Title>
      {error && <p className="text-red-400 mt-2">{error}</p>}
      {status && <p className="text-green-400 mt-2">{status}</p>}

      {/* Add Entry */}
      <Card className="mt-6 bg-gray-900 border-gray-700">
        <Text className="text-gray-300 font-medium mb-3">Add GitHub User</Text>
        <div className="flex gap-2">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="GitHub username"
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 flex-1"
          />
          <input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 flex-1"
          />
          <button
            onClick={addEntry}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </div>
      </Card>

      {/* Allowlist Table */}
      <Card className="mt-6 bg-gray-900 border-gray-700">
        <Text className="text-gray-300 font-medium mb-3">Allowlist Entries ({entries.length})</Text>
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Added By</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e._id} className="border-b border-gray-800">
                <td className="px-3 py-2 font-mono">{e.githubUsername}</td>
                <td className="px-3 py-2">{e.addedBy}</td>
                <td className="px-3 py-2">{e.notes}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleEntry(e._id, !e.enabled)}
                    className={e.enabled ? 'text-green-400' : 'text-red-400'}
                  >
                    {e.enabled ? 'Yes' : 'No'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => removeEntry(e._id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* User Role Assignment */}
      <Card className="mt-6 bg-gray-900 border-gray-700">
        <Text className="text-gray-300 font-medium mb-3">User Role Assignment</Text>
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-gray-800">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.roles?.[0] || ''}
                    onChange={(e) => updateUserRole(u._id, e.target.value)}
                    className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600"
                  >
                    <option value="">No role</option>
                    {roles.map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
