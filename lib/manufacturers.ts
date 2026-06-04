export interface CredentialField {
  name: string;
  label: string;
  type: "text" | "password" | "email";
  required: boolean;
  helpText?: string;
}

export interface ManufacturerConfig {
  apiType: string;
  displayName: string;
  category: "air" | "weather" | "energy" | "water" | "radiation" | "camera";
  fields: CredentialField[];
  optionalFields?: string[];
}

export const MANUFACTURER_CONFIG: Record<string, ManufacturerConfig> = {
  awair: {
    apiType: "awair",
    displayName: "Awair",
    category: "air",
    fields: [
      { name: "token", label: "API Token", type: "password", required: true, helpText: "Your Awair API token" },
      { name: "deviceId", label: "Device ID", type: "text", required: true, helpText: "Awair device identifier" },
    ],
    optionalFields: ["device_type"],
  },

  atmotube: {
    apiType: "atmotube",
    displayName: "Atmotube",
    category: "air",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your Atmotube API key" },
    ],
  },

  kaiterra: {
    apiType: "kaiterra",
    displayName: "Kaiterra",
    category: "air",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your Kaiterra API key" },
    ],
  },

  pebble: {
    apiType: "pebble",
    displayName: "Pebble",
    category: "air",
    fields: [
      { name: "imei", label: "IMEI", type: "text", required: true, helpText: "Device IMEI number" },
    ],
    optionalFields: ["owner"],
  },

  sensecap: {
    apiType: "sensecap",
    displayName: "SenseCAP",
    category: "air",
    fields: [
      { name: "username", label: "Username", type: "text", required: true, helpText: "SenseCAP account username" },
      { name: "password", label: "Password", type: "password", required: true, helpText: "SenseCAP account password" },
      { name: "device_eui", label: "Device EUI", type: "text", required: true, helpText: "SenseCAP device EUI" },
    ],
  },

  ambient: {
    apiType: "ambient",
    displayName: "Ambient Weather",
    category: "weather",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your Ambient Weather API key" },
      { name: "application_key", label: "Application Key", type: "password", required: true, helpText: "Ambient Weather application key" },
      { name: "mac_address", label: "MAC Address", type: "text", required: true, helpText: "Device MAC address" },
    ],
  },

  ecowitt: {
    apiType: "ecowitt",
    displayName: "Ecowitt",
    category: "weather",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your Ecowitt API key" },
      { name: "application_key", label: "Application Key", type: "password", required: true, helpText: "Ecowitt application key" },
    ],
  },

  "weather-xm": {
    apiType: "weather-xm",
    displayName: "Weather XM",
    category: "weather",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your Weather XM API key" },
      { name: "station_id", label: "Station ID", type: "text", required: true, helpText: "Weather station identifier" },
    ],
  },

  tempest: {
    apiType: "tempest",
    displayName: "Tempest (WeatherFlow)",
    category: "weather",
    fields: [
      { name: "station_id", label: "Station ID", type: "text", required: true, helpText: "Tempest station ID" },
      { name: "api_token", label: "API Token", type: "password", required: true, helpText: "Your Tempest API token" },
    ],
  },

  switchbot: {
    apiType: "switchbot",
    displayName: "SwitchBot",
    category: "energy",
    fields: [
      { name: "token", label: "API Token", type: "password", required: true, helpText: "Your SwitchBot API token" },
      { name: "secret", label: "API Secret", type: "password", required: true, helpText: "Your SwitchBot API secret" },
      { name: "deviceId", label: "Device ID", type: "text", required: true, helpText: "SwitchBot device ID" },
    ],
  },

  shelly: {
    apiType: "shelly",
    displayName: "Shelly",
    category: "energy",
    fields: [
      { name: "serverUrl", label: "Server URL", type: "text", required: true, helpText: "Shelly cloud server URL" },
      { name: "authKey", label: "Auth Key", type: "password", required: true, helpText: "Your Shelly auth key" },
      { name: "deviceId", label: "Device ID", type: "text", required: true, helpText: "Shelly device ID" },
    ],
  },

  iopool: {
    apiType: "iopool",
    displayName: "iopool",
    category: "water",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your iopool API key" },
      { name: "pool_id", label: "Pool ID", type: "text", required: true, helpText: "iopool pool identifier" },
    ],
  },

  gmcmap: {
    apiType: "gmcmap",
    displayName: "GMC Map",
    category: "radiation",
    fields: [
      { name: "gmcmap_id", label: "GMC Map ID", type: "text", required: true, helpText: "Your GMC Map device ID" },
    ],
  },

  airthings: {
    apiType: "airthings",
    displayName: "Airthings",
    category: "air",
    fields: [
      { name: "client_id", label: "Client ID", type: "text", required: true, helpText: "Airthings client ID" },
      { name: "client_secret", label: "Client Secret", type: "password", required: true, helpText: "Airthings client secret" },
    ],
  },

  govee: {
    apiType: "govee",
    displayName: "Govee",
    category: "air",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your Govee API key" },
      { name: "deviceId", label: "Device ID", type: "text", required: true, helpText: "Govee device ID" },
      { name: "sku", label: "SKU", type: "text", required: true, helpText: "Govee device SKU" },
    ],
  },

  nrfcloud: {
    apiType: "nrfcloud",
    displayName: "nRF Cloud",
    category: "air",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true, helpText: "Your nRF Cloud API key" },
      { name: "deviceId", label: "Device ID", type: "text", required: true, helpText: "nRF Cloud device ID" },
    ],
  },

  lacrosse: {
    apiType: "lacrosse",
    displayName: "La Crosse",
    category: "weather",
    fields: [
      { name: "username", label: "Username / Email", type: "email", required: true, helpText: "La Crosse account email" },
      { name: "password", label: "Password", type: "password", required: true, helpText: "La Crosse account password" },
    ],
  },

  eufy: {
    apiType: "eufy",
    displayName: "Eufy",
    category: "camera",
    fields: [
      { name: "email", label: "Email", type: "email", required: true, helpText: "Eufy account email" },
      { name: "password", label: "Password", type: "password", required: true, helpText: "Eufy account password" },
      { name: "device_sn", label: "Device SN", type: "text", required: true, helpText: "Eufy device serial number" },
    ],
  },

  nest: {
    apiType: "nest",
    displayName: "Google Nest",
    category: "camera",
    fields: [
      { name: "access_token", label: "Access Token", type: "password", required: true, helpText: "Nest access token" },
      { name: "refresh_token", label: "Refresh Token", type: "password", required: true, helpText: "Nest refresh token" },
      { name: "device_id", label: "Device ID", type: "text", required: true, helpText: "Nest device ID" },
    ],
  },
};

export const CATEGORY_ORDER: ManufacturerConfig["category"][] = [
  "air",
  "weather",
  "energy",
  "water",
  "radiation",
  "camera",
];

export function getManufacturerConfig(apiType: string): ManufacturerConfig | undefined {
  return MANUFACTURER_CONFIG[apiType];
}

export function getAllManufacturers(): ManufacturerConfig[] {
  return Object.values(MANUFACTURER_CONFIG).sort((a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
    a.displayName.localeCompare(b.displayName)
  );
}

export function getManufacturersByCategory(category: ManufacturerConfig["category"]): ManufacturerConfig[] {
  return Object.values(MANUFACTURER_CONFIG)
    .filter((m) => m.category === category)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
