import { useState, useEffect } from 'react';
import { Button, Text, TextInput, Callout, Flex } from '@tremor/react';
import Modal from 'react-modal';
import { modalStylesWithMinWidth } from '../lib/modal-styles';
import { MANUFACTURER_CONFIG, CredentialField } from '../lib/manufacturers';

interface CredentialState {
  api_type: string | null;
  credentials: Record<string, string>;
  credentials_saved_at?: string;
}

interface DeviceCredentialAdminProps {
  minerKey: string;
}

export default function DeviceCredentialAdmin({ minerKey }: DeviceCredentialAdminProps) {
  const [credentialState, setCredentialState] = useState<CredentialState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCredentials, setEditCredentials] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    fetchCredentialState();
  }, [minerKey]);

  const fetchCredentialState = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/credentials/${encodeURIComponent(minerKey)}`);
      if (!res.ok) throw new Error('Failed to fetch credentials');
      const data = await res.json();
      setCredentialState(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = () => {
    if (credentialState) {
      setEditCredentials({ ...credentialState.credentials });
      setShowPassword({});
      setShowEditModal(true);
      setSaveStatus('');
    }
  };

  const handleSave = async () => {
    if (!credentialState?.api_type) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const res = await fetch(`/api/admin/credentials/${encodeURIComponent(minerKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_type: credentialState.api_type,
          credentials: editCredentials
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save');
      }
      setSaveStatus('Saved successfully');
      setCredentialState(prev => prev ? { ...prev, credentials: { ...editCredentials }, credentials_saved_at: new Date().toISOString() } : null);
      setTimeout(() => {
        setShowEditModal(false);
        setSaveStatus('');
      }, 1000);
    } catch (err: any) {
      setSaveStatus(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const maskValue = (value: string, type?: string) => {
    if (!value) return '-';
    if (type === 'password') {
      if (value.length <= 4) return value;
      return value.slice(0, 4) + '...';
    }
    return value;
  };

  const config = credentialState?.api_type ? MANUFACTURER_CONFIG[credentialState.api_type] : undefined;

  if (loading) return <Text className="text-gray-400">Loading credentials...</Text>;
  if (error) return <Callout title="Error" color="red">{error}</Callout>;
  if (!credentialState || !credentialState.api_type) {
    return <Text className="text-gray-400">No credentials configured for this device.</Text>;
  }

  return (
    <div className="space-y-2">
      <Flex alignItems="center" justifyContent="start" className="gap-4">
        <Text className="text-gray-300">
          <strong>API Type:</strong> {config?.displayName || credentialState.api_type}
        </Text>
        <Button size="xs" onClick={handleEditOpen}>Edit</Button>
      </Flex>
      <div className="bg-gray-900 rounded-md p-3 border border-gray-700">
        {config?.fields.map((field: CredentialField) => (
          <div key={field.name} className="flex justify-between py-1">
            <Text className="text-gray-400 text-sm">{field.label}:</Text>
            <Text className="text-gray-200 text-sm font-mono">
              {maskValue(credentialState.credentials[field.name], field.type)}
            </Text>
          </div>
        ))}
        {credentialState.credentials_saved_at && (
          <Text className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(credentialState.credentials_saved_at).toLocaleString()}
          </Text>
        )}
      </div>

      <Modal
        isOpen={showEditModal}
        closeTimeoutMS={300}
        style={modalStylesWithMinWidth}
        contentLabel="Edit Credentials"
      >
        <Flex flexDirection="col" className="gap-3 w-full">
          <h2><strong>Edit Credentials</strong></h2>
          {config?.fields.map((field: CredentialField) => (
            <div key={field.name} className="w-full">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <TextInput
                  type={field.type === 'password' && !showPassword[field.name] ? 'password' : field.type === 'email' ? 'email' : 'text'}
                  placeholder={field.label}
                  value={editCredentials[field.name] || ''}
                  onValueChange={(value) => setEditCredentials(prev => ({ ...prev, [field.name]: value }))}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200 bg-transparent border-none cursor-pointer"
                  >
                    {showPassword[field.name] ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              {field.helpText && (
                <Text className="text-xs text-gray-500 mt-1">{field.helpText}</Text>
              )}
            </div>
          ))}
          {saveStatus && (
            <Callout title={saveStatus.includes('Error') || saveStatus.includes('Failed') ? 'Error' : 'Success'} color={saveStatus.includes('Error') || saveStatus.includes('Failed') ? 'red' : 'teal'}>
              {saveStatus}
            </Callout>
          )}
          <Flex className="gap-2">
            <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} loadingText="Saving...">Save</Button>
          </Flex>
        </Flex>
      </Modal>
    </div>
  );
}
