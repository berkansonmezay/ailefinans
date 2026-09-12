#!/bin/bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@test.com", "password": "Password123", "firstName": "Test", "lastName": "User", "tenantName": "Test Tenant"}'

echo ""
echo "Now approving user..."
sqlite3 dev.db "UPDATE User SET isActive = 1 WHERE email = 'test@test.com';"

echo "Now logging in..."
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "testuser", "password": "Password123"}'
