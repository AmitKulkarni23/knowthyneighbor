// Dev-only auth bypasses; forced off in production builds so a stray env var can't disable auth
const isProduction = process.env.NODE_ENV === 'production';

export const SKIP_AUTH = !isProduction && process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';
export const MSW_ENABLED = !isProduction && process.env.NEXT_PUBLIC_MSW === 'true';
