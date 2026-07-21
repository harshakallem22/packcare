// Gateway base URL. In Docker this is reached from the browser, so it's the host port.
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:4000';
