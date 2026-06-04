import {
  Button,
  SearchSelect,
  SearchSelectItem,
  Text,
  TextInput
} from '@tremor/react';
import { useState } from 'react';
import { addDevice } from './server-util';
import { getAllManufacturers, getManufacturerConfig } from '../lib/manufacturers';

export default function DeviceForm({ products }: { products: any[] }) {
  const [deviceType, setDeviceType] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [order, setOrder] = useState('');
  const [byod, setByod] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const manufacturers = getAllManufacturers();
  const config = manufacturer ? getManufacturerConfig(manufacturer) : null;

  const handleCredentialChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
  };

  const canSubmit = () => {
    if (!deviceType || !selectedUser || !order) return false;
    if (manufacturer) {
      if (!config) return false;
      for (const field of config.fields) {
        if (field.required && !credentials[field.name]?.trim()) return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const res = await addDevice({
      email: selectedUser,
      id: deviceType,
      order,
      byod,
      ...(manufacturer && config ? { api_type: manufacturer, credentials } : {}),
    });
    if (res) {
      setStatus('Success');
      // Reset form
      setDeviceType('');
      setSelectedUser('');
      setOrder('');
      setByod('');
      setManufacturer('');
      setCredentials({});
    } else {
      setStatus('Failed..');
    }
    setIsLoading(false);
  };

  return (
    <div>
      <Text className="mb-4">
        Select a device type and a user, then click submit to generate a key. Optionally choose a manufacturer to enter credentials.
      </Text>
      <SearchSelect
        className="mb-4 ml-10"
        placeholder="Select a device type..."
        onValueChange={(value) => setDeviceType(value)}
        value={deviceType}
      >
        {products &&
          products.map((product) => (
            <SearchSelectItem key={product._id} value={product._id}>
              {product.key} - {product.name}
            </SearchSelectItem>
          ))}
      </SearchSelect>

      {deviceType ? (
        <TextInput
          className="mb-4 ml-10"
          placeholder="Email"
          onValueChange={(value) => setSelectedUser(value)}
          value={selectedUser}
        />
      ) : (
        ''
      )}
      {selectedUser ? (
        <TextInput
          className="mb-4 ml-10"
          placeholder="Order"
          onValueChange={(value) => setOrder(value)}
          value={order}
        />
      ) : (
        ''
      )}
      {order ? (
        <TextInput
          className="mb-4 ml-10"
          placeholder="Byod (leave empty if not byod)"
          onValueChange={(value) => setByod(value)}
          value={byod}
        />
      ) : (
        ''
      )}

      {order ? (
        <div className="mb-4 ml-10">
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Manufacturer <span className="text-gray-400">(optional)</span>
          </label>
          <SearchSelect
            placeholder="Select a manufacturer..."
            onValueChange={(value) => {
              setManufacturer(value);
              setCredentials({});
            }}
            value={manufacturer}
          >
            {manufacturers.map((m) => (
              <SearchSelectItem key={m.apiType} value={m.apiType}>
                {m.displayName} ({m.category})
              </SearchSelectItem>
            ))}
          </SearchSelect>
        </div>
      ) : (
        ''
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
                  onValueChange={(value) => handleCredentialChange(field.name, value)}
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
        </div>
      )}

      {order ? (
        <Button
          className="ml-10"
          style={{
            backgroundColor: 'RGB(73, 197, 105)'
          }}
          loading={isLoading}
          loadingText="Sending to server..."
          disabled={!canSubmit()}
          onClick={handleSubmit}
        >
          {status ? status : 'Send to server'}
        </Button>
      ) : (
        ''
      )}
    </div>
  );
}
