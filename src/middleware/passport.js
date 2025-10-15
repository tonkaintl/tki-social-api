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

  // Use client ID as audience since that's what Azure AD puts in the token
  // The API URI format is used for scopes, not audience
  const audience = authConfig.credentials.clientID;

  const bearerStrategy = new BearerStrategy(
    {
      audience: audience,
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

        // Debug token claims for troubleshooting
        logger.debug('Bearer token validated', {
          audience: token.aud,
          email: req.email,
          issuer: token.iss,
          oid: token.oid,
          scope: token.scp,
        });

        // Validate scope if configured
        if (token.scp && !token.scp.includes('TKI-Social.ReadWrite')) {
          logger.warn('Token missing required scope', {
            email: req.email,
            requiredScope: 'TKI-Social.ReadWrite',
            tokenScope: token.scp,
          });
          return done(new Error('Insufficient scope permissions'));
        }

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
