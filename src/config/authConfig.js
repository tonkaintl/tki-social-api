import { config } from './env.js';

/**
 * Azure AD authentication configuration
 * Used for Bearer token validation with passport-azure-ad
 */
const authConfig = {
  credentials: {
    apiAudience: config.AZURE_API_AUDIENCE,
    clientID: config.AZURE_CLIENT_ID,
    tenantID: config.AZURE_TENANT_ID,
  },
  metadata: {
    authority: 'login.microsoftonline.com',
    discovery: '.well-known/openid-configuration',
    version: 'v2.0',
  },
  settings: {
    loggingLevel: config.NODE_ENV === 'production' ? 'error' : 'info',
    loggingNoPII: config.NODE_ENV === 'production',
    passReqToCallback: true,
    validateIssuer: true,
  },
};

export default authConfig;
