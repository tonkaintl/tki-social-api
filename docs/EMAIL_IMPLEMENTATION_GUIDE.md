# Email Implementation Guide - TKI Social API

This document explains how email sending is implemented in the TKI Social API, using **Microsoft Graph API** for email delivery.

## Overview

The application uses Microsoft's Graph API (not SMTP) to send emails through Azure AD authentication. This provides enterprise-grade email delivery with proper OAuth2 authentication.

## Key Components

### 1. Email Service (`src/services/email.service.js`)

A singleton service that handles:

- Azure AD authentication
- Access token management
- Email delivery via Microsoft Graph API

### 2. Required Environment Variables

```bash
# Azure AD Application Credentials
AZURE_TENANT_ID=your-tenant-id
AZURE_EMAIL_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Email Configuration
AZURE_EMAIL_SENDER=sender@yourdomain.com
AZURE_GRAPH_API=https://graph.microsoft.com/v1.0

# Optional: Email Recipients (comma-separated)
TONKA_SPARK_RECIPIENTS=recipient1@example.com,recipient2@example.com
```

### 3. Azure AD Permissions Required

The Azure AD app registration needs:

- **API Permission**: `Microsoft Graph` → `Mail.Send` (Application permission)
- **Admin Consent**: Required for application permissions
- **Account**: The sender email must be a real mailbox in your Microsoft 365 tenant

## Implementation Details

### Authentication Flow

```javascript
import { ClientSecretCredential } from '@azure/identity';

// 1. Create credential object
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

// 2. Get access token for Microsoft Graph
const tokenResponse = await credential.getToken(
  'https://graph.microsoft.com/.default'
);

// 3. Use token in API calls
const accessToken = tokenResponse.token;
```

### Sending Email

```javascript
import { emailService } from './src/services/email.service.js';

// Send to single recipient
await emailService.sendEmail({
  to: 'recipient@example.com',
  subject: 'Your Subject',
  htmlBody: '<h1>Hello</h1><p>Your content</p>',
});

// Send to multiple recipients
await emailService.sendEmail({
  to: ['recipient1@example.com', 'recipient2@example.com'],
  subject: 'Your Subject',
  htmlBody: '<h1>Hello</h1><p>Your content</p>',
});
```

### Email Data Structure

The service constructs the Microsoft Graph API payload:

```javascript
{
  message: {
    subject: "Email Subject",
    body: {
      contentType: "HTML",
      content: "<h1>HTML Content</h1>"
    },
    from: {
      emailAddress: {
        address: "sender@yourdomain.com"
      }
    },
    toRecipients: [
      {
        emailAddress: {
          address: "recipient@example.com"
        }
      }
    ]
  },
  saveToSentItems: true
}
```

### API Endpoint Used

```
POST https://graph.microsoft.com/v1.0/users/{senderEmail}/sendMail
Authorization: Bearer {accessToken}
Content-Type: application/json
```

## Common Issues & Solutions

### 1. "Failed to obtain access token"

**Cause**: Missing or invalid Azure credentials

**Solution**:

- Verify `AZURE_TENANT_ID`, `AZURE_EMAIL_CLIENT_ID`, and `AZURE_CLIENT_SECRET` are set
- Ensure credentials are correct in Azure Portal
- Check that client secret hasn't expired

### 2. 401 Unauthorized or "Access Denied"

**Cause**: Missing Exchange Online Application Access Policy

**Solution**:
When using **application permissions** (not delegated), you MUST configure an Application Access Policy in Exchange Online to restrict which mailboxes the app can send from:

```powershell
# Connect to Exchange Online PowerShell
Install-Module ExchangeOnlineManagement -Force -Scope CurrentUser
Connect-ExchangeOnline

# Create mail-enabled security group (if needed)
New-DistributionGroup -Name "GraphAPI-SendMail-Group" -Type "Security"
Add-DistributionGroupMember -Identity "GraphAPI-SendMail-Group" -Member "sender@yourdomain.com"

# Create application access policy
New-ApplicationAccessPolicy -AppId "your-client-id" `
  -PolicyScopeGroupId "GraphAPI-SendMail-Group" `
  -AccessRight RestrictAccess `
  -Description "Restrict Graph API to send only from specific mailbox"

# Verify the policy
Test-ApplicationAccessPolicy -Identity "sender@yourdomain.com" -AppId "your-client-id"
```

### 3. "Mailbox not found" or 403 Forbidden

**Cause**:

- Sender email doesn't exist in the Microsoft 365 tenant
- Missing API permissions
- Admin consent not granted

**Solution**:

- Ensure `AZURE_EMAIL_SENDER` is a valid mailbox in your tenant
- Grant `Mail.Send` application permission in Azure AD
- Admin must grant consent for the permission

### 3. "Invalid recipient"

**Cause**: Malformed email addresses

**Solution**:

- Ensure recipients are properly formatted email addresses
- When using comma-separated list from env, properly parse:
  ```javascript
  const recipients = config.TONKA_SPARK_RECIPIENTS.split(',').map(e =>
    e.trim()
  );
  ```

### 4. Network or timeout errors

**Cause**: Graph API connectivity issues

**Solution**:

- Check network connectivity to `https://graph.microsoft.com`
- Verify firewall/proxy settings allow HTTPS to Microsoft Graph
- Check Azure service health status

## Dependencies

```json
{
  "@azure/identity": "^4.0.0", // Azure AD authentication
  "axios": "^1.6.0" // HTTP client for Graph API
}
```

## Example Test Script

```javascript
import { config } from './src/config/env.js';
import { emailService } from './src/services/email.service.js';

async function testEmail() {
  try {
    // Parse recipients from environment
    const recipients = config.TONKA_SPARK_RECIPIENTS.split(',').map(e =>
      e.trim()
    );

    // Send email
    await emailService.sendEmail({
      to: recipients,
      subject: 'Test Email',
      htmlBody: `
        <h1>Test Email</h1>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });

    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    process.exit(1);
  }
}

testEmail();
```

## Health Check

The service includes a health check method:

```javascript
const health = await emailService.healthCheck();
// Returns:
// {
//   status: 'healthy',
//   configured: true,
//   senderEmail: 'sender@yourdomain.com'
// }
```

## Key Differences from Traditional SMTP

| Feature        | Traditional SMTP    | Microsoft Graph API       |
| -------------- | ------------------- | ------------------------- |
| Authentication | Username/Password   | OAuth2 Client Credentials |
| Protocol       | SMTP (Port 25/587)  | HTTPS REST API            |
| Permissions    | Account credentials | Azure AD app permissions  |
| Security       | TLS/SSL             | Azure AD + HTTPS          |
| Rate Limits    | Server-dependent    | Microsoft Graph limits    |

## Best Practices

1. **Don't hardcode credentials** - Always use environment variables
2. **Handle errors gracefully** - Wrap in try-catch with proper logging
3. **Parse recipients carefully** - Trim whitespace from comma-separated lists
4. **Test authentication first** - Use `healthCheck()` to verify config
5. **Monitor token expiration** - Service automatically gets fresh tokens
6. **Log appropriately** - Log successes/failures but not sensitive data
7. **Validate HTML** - Ensure email body is valid HTML

## Azure Portal Setup Steps

1. **Register App** in Azure AD
2. **Add API Permission**: Microsoft Graph → Mail.Send (Application)
3. **Grant Admin Consent** for the permission
4. **Create Client Secret** and copy the value
5. **Copy Tenant ID** and **Application (client) ID**
6. **Verify sender mailbox exists** in Microsoft 365
7. **Configure Exchange Online Application Access Policy** (CRITICAL - see below)
8. **Add credentials to .env file**

### Exchange Online Application Access Policy (Required!)

When using application permissions, you **must** configure an access policy:

```powershell
# 1. Install and connect to Exchange Online
Install-Module ExchangeOnlineManagement -Force -Scope CurrentUser
Connect-ExchangeOnline

# 2. Create a mail-enabled security group with allowed sender(s)
New-DistributionGroup -Name "GraphAPI-SendMail-Allowed" -Type "Security"
Add-DistributionGroupMember -Identity "GraphAPI-SendMail-Allowed" `
  -Member "sender@yourdomain.com"

# 3. Create the application access policy
New-ApplicationAccessPolicy `
  -AppId "your-azure-app-client-id" `
  -PolicyScopeGroupId "GraphAPI-SendMail-Allowed" `
  -AccessRight RestrictAccess `
  -Description "Restrict Graph API mail sending to specific mailboxes"

# 4. Test the policy (should return "Granted")
Test-ApplicationAccessPolicy `
  -Identity "sender@yourdomain.com" `
  -AppId "your-azure-app-client-id"

# 5. Disconnect
Disconnect-ExchangeOnline
```

**Why is this needed?**

- Application permissions grant broad access to ALL mailboxes
- Exchange requires you to explicitly scope which mailboxes the app can use
- Without this policy, you'll get **401 Unauthorized** errors
- The policy typically takes 15-60 minutes to propagate

## Troubleshooting Checklist

- [ ] All required environment variables are set
- [ ] Azure AD app has `Mail.Send` permission with admin consent
- [ ] **Exchange Online Application Access Policy is configured** (CRITICAL!)
- [ ] Application Access Policy has been tested and shows "Granted"
- [ ] Waited 15-60 minutes after creating the policy for propagation
- [ ] Client secret is valid and not expired
- [ ] Sender email exists as a mailbox in your tenant
- [ ] Network allows HTTPS to graph.microsoft.com
- [ ] Recipient email addresses are valid
- [ ] HTML content is properly formatted
- [ ] `@azure/identity` package is installed

## Additional Resources

- [Microsoft Graph API Mail Reference](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
- [Azure Identity SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/identity-readme)
- [Configure Mail.Send Permission](https://learn.microsoft.com/en-us/graph/permissions-reference#mailsend)
- [**Application Access Policy (CRITICAL)**](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access)
- [Exchange Online PowerShell](https://learn.microsoft.com/en-us/powershell/exchange/exchange-online-powershell)
