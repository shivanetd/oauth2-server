/**
 * Test script for token introspection and revocation endpoints
 * 
 * To run:
 * npx tsx test-oauth-endpoints.ts
 */

import axios from 'axios';
import crypto from 'crypto';

// Set up variables
const BASE_URL = 'http://localhost:5000';
const CLIENT_ID = '9413746fb37e01c116a2de7ea8a98a2e'; // TestApp client
const CLIENT_SECRET = '816d34cd6cfc3bbeece0c9a99e33c6a4958528355a1cd994743efb7064c865fd';

async function testTokenIntrospection() {
  try {
    console.log('Testing token introspection endpoint...');
    console.log('Using client ID:', CLIENT_ID);
    
    // 1. First we need to get a valid token using client credentials grant
    console.log('Requesting token with client_credentials grant...');
    const tokenResponse = await axios.post(`${BASE_URL}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'read'
    });
    
    const accessToken = tokenResponse.data.access_token;
    console.log('Successfully obtained access token');
    console.log('Token response:', JSON.stringify(tokenResponse.data, null, 2));
    
    // 2. Introspect the token using Basic auth
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    let introspectionData;
    console.log('Sending introspection request...');
    try {
      const introspectionResponse = await axios.post(
        `${BASE_URL}/oauth/introspect`,
        { token: accessToken },
        { headers: { Authorization: `Basic ${authString}` } }
      );
      
      introspectionData = introspectionResponse.data;
      console.log('Introspection response:', JSON.stringify(introspectionData, null, 2));
    } catch (error) {
      console.error('Introspection request failed:', error.response?.data || error.message);
      introspectionData = { active: false };
    }
    
    // Should show active: true and scope information
    if (introspectionData.active) {
      console.log('✅ Token introspection successful - token is active');
    } else {
      console.log('❌ Token introspection failed - token is not active');
    }
    
    return { accessToken, refreshToken: tokenResponse.data.refresh_token };
  } catch (error) {
    console.error('Error in token introspection test:', error.response?.data || error.message);
    return null;
  }
}

async function testTokenRevocation(tokens: { accessToken: string, refreshToken: string }) {
  try {
    console.log('\nTesting token revocation endpoint...');
    
    // Revoke the access token
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const revocationResponse = await axios.post(
      `${BASE_URL}/oauth/revoke`,
      { token: tokens.accessToken },
      { headers: { Authorization: `Basic ${authString}` } }
    );
    
    console.log('Revocation response status:', revocationResponse.status);
    
    // Check if the token is now invalid by introspecting it
    let introspectionData;
    console.log('Sending introspection request after revocation...');
    try {
      const introspectionResponse = await axios.post(
        `${BASE_URL}/oauth/introspect`,
        { token: tokens.accessToken },
        { headers: { Authorization: `Basic ${authString}` } }
      );
      
      introspectionData = introspectionResponse.data;
      console.log('Introspection after revocation:', JSON.stringify(introspectionData, null, 2));
    } catch (error) {
      console.error('Introspection after revocation failed:', error.response?.data || error.message);
      introspectionData = { active: true };  // Assume failure if we can't check
    }
    
    if (!introspectionData.active) {
      console.log('✅ Token revocation successful - token is now inactive');
    } else {
      console.log('❌ Token revocation failed - token is still active');
    }
    
  } catch (error) {
    console.error('Error in token revocation test:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('OAuth2 Token Introspection and Revocation Test');
  console.log('==============================================');
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Please set CLIENT_ID and CLIENT_SECRET in the script');
    return;
  }
  
  const tokens = await testTokenIntrospection();
  if (tokens) {
    await testTokenRevocation(tokens);
  }
}

main().catch(console.error);