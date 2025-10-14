import passport from 'passport';
import { BearerStrategy } from 'passport-azure-ad';

import authConfig from '../config/authConfig.js';
import { logger } from '../utils/logger.js';

/**
 * Configure Passport with Azure AD Bearer Strategy
 * Validates JWT tokens from Microsoft Entra ID
 */
export default function configurePassport() {
  // Validate required configuration
  if (!authConfig.credentials.clientID || !authConfig.credentials.tenantID) {
    logger.warn(
      'Azure AD credentials missing - Bearer strategy not configured'
    );
    return;
  }

  const bearerStrategy = new BearerStrategy(
    {
      audience: authConfig.credentials.clientID,
      clientID: authConfig.credentials.clientID,
      identityMetadata: `https://${authConfig.metadata.authority}/${authConfig.credentials.tenantID}/${authConfig.metadata.version}/${authConfig.metadata.discovery}`,
      issuer: `https://${authConfig.metadata.authority}/${authConfig.credentials.tenantID}/${authConfig.metadata.version}`,
      loggingLevel: authConfig.settings.loggingLevel,
      loggingNoPII: authConfig.settings.loggingNoPII,
      passReqToCallback: authConfig.settings.passReqToCallback,
      validateIssuer: authConfig.settings.validateIssuer,
    },
    (req, token, done) => {
      try {
        // Extract email from token
        req.email = token.email || token.preferred_username;
        req.azureToken = token;

        logger.debug('Bearer token validated', {
          email: req.email,
          oid: token.oid,
        });

        done(null, token);
      } catch (err) {
        logger.error('Bearer token validation error', { error: err.message });
        done(err);
      }
    }
  );

  passport.use(bearerStrategy);

  logger.info('Passport configured with Azure AD Bearer Strategy');
}
