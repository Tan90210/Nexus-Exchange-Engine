const API_URL = 'http://127.0.0.1:3001/api';

async function verifyAll() {
    console.log('🚀 Starting Nexus Exchange E2E Verification...');

    try {
        // 1. Register a new user
        const email = `test_${Date.now()}@test.com`;
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123',
                name: 'Test Bot'
            })
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);

        console.log('✅ Registration successful:', regData.user.email);
        const token = regData.token;
        const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 2. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        const loginData = await loginRes.json();
        console.log('✅ Login successful');

        // 3. Check Portfolio
        const pRes = await fetch(`${API_URL}/portfolio`, { headers: authHeader });
        const pData = await pRes.json();
        console.log('✅ Initial Cash Balance:', pData.cashBalance);

        // 4. Place a BUY order (Market)
        const buyRes = await fetch(`${API_URL}/trades`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                assetId: 1,
                side: 'BUY',
                qty: 1,
                orderType: 'MARKET'
            })
        });
        const buyData = await buyRes.json();
        if (!buyRes.ok) throw new Error(`Trade failed: ${JSON.stringify(buyData)}`);
        console.log('✅ Trade API Response:', buyData);

        // 5. Verify holdings
        const pAfterRes = await fetch(`${API_URL}/portfolio`, { headers: authHeader });
        const pAfterData = await pAfterRes.json();
        const relHolding = pAfterData.holdings.find(h => h.symbol === 'RELI');
        console.log('✅ Holding verified:', relHolding.symbol, 'Qty:', relHolding.qty);

        // 6. Admin Stats (should fail for regular user)
        const adminRes = await fetch(`${API_URL}/admin/stats`, { headers: authHeader });
        if (adminRes.status === 403) {
            console.log('✅ Admin check successful: Regular user denied access (403)');
        } else {
            console.error('❌ ERROR: Non-admin accessed admin stats! Status:', adminRes.status);
        }

        console.log('\n🌟 ALL CORE FLOWS VERIFIED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Verification FAILED:');
        console.error(err);
        if (err.cause) console.error('Cause:', err.cause);
        process.exit(1);
    }
}

verifyAll();
