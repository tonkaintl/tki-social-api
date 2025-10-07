# LinkedIn API Setup Guide

This guide walks you through setting up LinkedIn API integration for the TKI Social API.

## 🎯 Overview

LinkedIn's developer experience is straightforward and developer-friendly. Unlike Meta, LinkedIn:

- ✅ Has clear documentation
- ✅ Fast app approval process
- ✅ Reasonable permission requirements
- ✅ Responsive developer support

## 📋 Prerequisites

- LinkedIn account (personal or business)
- Access to LinkedIn Developer Portal
- Company page (if posting to organization accounts)

## 🚀 Step 1: Create LinkedIn App

### App Creation Form Fields:

**App Name**: `TKI Social API`  
**LinkedIn Page**: Select your company page (or create one)  
**App Logo**: Upload your company logo (optional but recommended)  
**Legal agreement**: Check the box

### App Details:

**App description**:

```
TKI Social API is a production-ready service for managing social media content across multiple platforms. This app enables automated posting and content management for TKI Binder ERP system.
```

**Website URL**: `https://api.social.tkibinder.com`  
**Business email**: Your business email  
**Privacy Policy URL**: `https://api.social.tkibinder.com/privacy` (create if needed)

## 🔑 Step 2: Configure Products & Permissions

After creating the app, you'll need to request access to LinkedIn products:

### Required Products:

1. **Sign In with LinkedIn using OpenID Connect** ✅ (Usually auto-approved)
2. **Share on LinkedIn** ✅ (Usually auto-approved)
3. **Marketing Developer Platform** (May require review for advanced features)

### Required Scopes:

- `openid` - Basic authentication
- `profile` - Access to profile information
- `email` - Access to email address
- `w_member_social` - Write access to post on behalf of user
- `w_organization_social` - Write access to post on behalf of organization (if posting to company pages)

## 🔧 Step 3: Get Your Credentials

After app approval, you'll get:

### App Credentials:

```
Client ID: [Your LinkedIn App Client ID]
Client Secret: [Your LinkedIn App Client Secret]
```

### OAuth URLs:

```
Authorization URL: https://www.linkedin.com/oauth/v2/authorization
Token URL: https://www.linkedin.com/oauth/v2/accessToken
```

## 🎫 Step 4: Get Access Token

### For Testing (Quick Method):

1. Go to your app's "Auth" tab
2. Use the "Request access token" feature
3. Copy the generated token (valid for 60 days)

### For Production (OAuth Flow):

```javascript
// Authorization URL
https://www.linkedin.com/oauth/v2/authorization?
  response_type=code&
  client_id={YOUR_CLIENT_ID}&
  redirect_uri={YOUR_REDIRECT_URI}&
  scope=openid%20profile%20email%20w_member_social

// Exchange code for token
POST https://www.linkedin.com/oauth/v2/accessToken
{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "YOUR_REDIRECT_URI"
}
```

## ⚙️ Step 5: Configure TKI Social API

Update your `.env` file:

```bash
# LinkedIn Configuration
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token_here
```

## 🧪 Step 6: Test Your Integration

### Test API Connection:

```bash
# Test with our live API
curl -X GET "https://api.social.tkibinder.com/social/fetch?provider=linkedin" \
  -H "x-internal-secret: t0nk@B1nd3r-DB-53751013-T0k3n-53cr3t"
```

### Test Post Creation:

```bash
curl -X POST "https://api.social.tkibinder.com/social/post" \
  -H "x-internal-secret: t0nk@B1nd3r-DB-53751013-T0k3n-53cr3t" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello LinkedIn! Posted via TKI Social API 🚀",
    "provider": "linkedin"
  }'
```

## 📡 Step 7: Webhook Setup (Optional)

LinkedIn webhooks are limited and require special approval. Most integrations use polling instead.

If you need real-time updates:

1. Request webhook access from LinkedIn
2. Configure webhook URL: `https://api.social.tkibinder.com/webhooks/linkedin`
3. Set up signature verification

## 🎯 LinkedIn API Capabilities

### ✅ What Works Great:

- **Personal Posts**: Share updates to your timeline
- **Company Posts**: Post to organization pages
- **Rich Media**: Images, videos, documents
- **Analytics**: Post performance metrics
- **User Profile**: Access to profile information

### ⚠️ Limitations:

- **Comments**: Limited commenting API access
- **Direct Messages**: Requires special approval
- **Webhooks**: Limited availability
- **Rate Limits**: 500 calls per app per day (free tier)

## 🔄 Step 8: API Usage Examples

### Creating a Personal Post:

```javascript
// This is handled automatically by our LinkedIn adapter
const result = await socialApi.createPost({
  provider: 'linkedin',
  message: 'Hello from TKI Social API!',
  // pageIdOrHandle: optional for personal posts
});
```

### Creating a Company Post:

```javascript
const result = await socialApi.createPost({
  provider: 'linkedin',
  message: 'Company update from TKI Social API!',
  pageIdOrHandle: 'urn:li:organization:123456789',
});
```

### Fetching Posts:

```javascript
const posts = await socialApi.fetchPosts({
  provider: 'linkedin',
  pageIdOrHandle: 'urn:li:person:ABC123', // or organization URN
  limit: 25,
});
```

## 🆘 Troubleshooting

### Common Issues:

**"Invalid access token"**

- Check token expiration (LinkedIn tokens expire in 60 days)
- Verify scopes match your usage
- Regenerate token from LinkedIn Developer Console

**"Insufficient permissions"**

- Request additional scopes in your LinkedIn app
- Some features require app review

**"Rate limit exceeded"**

- LinkedIn free tier: 500 calls/day
- Implement caching and request batching
- Consider upgrading to paid tier

## 📚 Useful Resources

- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [LinkedIn Developer Console](https://www.linkedin.com/developers/apps)
- [Share API Reference](https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin)
- [UGC Post API](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api)

## 🎉 Success Checklist

- [ ] LinkedIn app created
- [ ] Required permissions requested/approved
- [ ] Client ID and Secret obtained
- [ ] Access token generated
- [ ] Environment variables configured
- [ ] API connection tested
- [ ] First post created successfully
- [ ] Error handling verified

---

**Next Steps**: Once you have your LinkedIn credentials, you can test the integration immediately. The LinkedIn adapter is production-ready and waiting for your credentials! 🚀
