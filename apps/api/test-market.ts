import axios from "axios";
import jwt from "jsonwebtoken";

const token = jwt.sign({ sub: 'user_123', email: 'test@test.com', tenantId: 'tenant_123' }, '"family-finance-super-secret-key-2026"', { expiresIn: '1h' });

axios.get('http://localhost:4000/api/v1/market/rates', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(JSON.stringify(res.data, null, 2)))
  .catch(err => console.error(err.response?.status, err.response?.data || err.message));
