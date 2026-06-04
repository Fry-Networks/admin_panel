import { useState } from 'react';
import { Button, Text, TextInput } from '@tremor/react';
import { getManufacturerConfig, getAllManufacturers } from '../lib/manufacturers';

export default function AdminCredentialEdit() {
  const [minerKey, setMinerKey] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [currentData, setCurrentData] = useState<any>(null);

  const config = manufacturer ? getManufacturerConfig(manufacturer) : null;
  const manufacturers = getAllManufacturers();

  const fetchCredentials = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/credentials/${encodeURIComponent(minerKey)}`);
      const data = await res.json();
      setCurrentData(data);
      if (data.api_type) {
        setManufacturer(data.api_type);
        setCredentials(data.credentials || {});
      } else {
        setManufacturer('');
        setCredentials({});
      }
    } catch (err) {
      setStatus('Failed to fetch');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/credentials/${encodeURIComponent(minerKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_type: manufacturer, credentials }),
      });
      if (res.ok) {
        setStatus('Saved successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(data.message || 'Save failed');
      }
    } catch (err) {
      setStatus('Save failed');
    }
    setLoading(false);
  };

  const canSubmit = () => {
    if (!manufacturer || !config) return false;
    for (const field of config.fields) {
      if (field.required && !credentials[field.name]?.trim()) return false;
    }
    return true;
  };

  return (
    <div>
      <Text className="mb-4">Edit device credentials by miner key</Text>
      <div className="flex gap-2 mb-4 ml-10">
        <TextInput
          placeholder="Enter miner key"
          value={minerKey}
          onValueChange={setMinerKey}
        />
        <Button onClick={fetchCredentials} loading={loading}>Fetch</Button>
      </div>

      {currentData && (
        <div className="ml-10 mb-4">
          <Text className="text-sm text-gray-300">
            Current API type: {currentData.api_type || 'None'}
          </Text>
        </div>
      )}

      {minerKey && (
        <div className="mb-4 ml-10">
          <label className="block text-sm font-medium text-gray-200 mb-1">Manufacturer</label>
          <select
            className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
            value={manufacturer}
            onChange={(e) => {
              setManufacturer(e.target.value);
              setCredentials({});
            }}
          >
            <option value="">Select manufacturer...</option>
            {manufacturers.map((m) => (
              <option key={m.apiType} value={m.apiType}>
                {m.displayName} ({m.category})
              </option>
            ))}
          </select>
        </div>
      )}

      {config && (
        <div className="mb-4 ml-10 space-y-3">
          <Text className="text-sm text-gray-300">Credential Fields</Text>
          {config.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-400">*</span>}
              </label>
              <div className="relative">
                <TextInput
                  type={
                    field.type === 'password' && !showPassword[field.name]
                      ? 'password'
                      : field.type === 'email'
                      ? 'email'
                      : 'text'
                  }
                  placeholder={field.label}
                  value={credentials[field.name] || ''}
                  onValueChange={(value) =>
                    setCredentials((prev) => ({ ...prev, [field.name]: value }))
                  }
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        [field.name]: !prev[field.name],
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
                  >
                    {showPassword[field.name] ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              {field.helpText && (
                <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
              )}
            </div>
          ))}

          <Button
            style={{ backgroundColor: 'RGB(73, 197, 105)' }}
            loading={loading}
            disabled={!canSubmit()}
            onClick={handleSubmit}
          >
            {status || 'Save Credentials'}
          </Button>
        </div>
      )}
    </div>
  );
}
