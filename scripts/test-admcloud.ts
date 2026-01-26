/**
 * Script para probar la conexión con AdmCloud
 * Ejecutar con: npx ts-node --esm scripts/test-admcloud.ts
 */

const ADMCLOUD_BASE_URL = 'https://api.admcloud.net/api';

const config = {
    appId: 'f9218618-ee43-4ca0-52f9-08de5d1ccc34',
    username: 'eliezer@nearbycrm.com',
    password: 'Nearby.321',
    company: '030c4f39-3188-4485-b557-2b47b51f4cf3',
    role: 'Administradores',
};

async function testConnection() {
    console.log('Testing AdmCloud connection...\n');
    
    // Build URL with query params
    const params = new URLSearchParams({
        skip: '0',
        appid: config.appId,
        company: config.company,
        role: config.role,
    });
    
    const url = `${ADMCLOUD_BASE_URL}/Customers?${params.toString()}`;
    console.log('URL:', url.replace(config.appId, 'APP_ID_HIDDEN'));
    
    // Build Basic Auth header
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const authHeader = `Basic ${credentials}`;
    console.log('Auth Header:', `Basic ${credentials.substring(0, 10)}...`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
        });
        
        console.log('\nResponse Status:', response.status, response.statusText);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('\nSuccess! Got', Array.isArray(data) ? data.length : 1, 'customers');
            if (Array.isArray(data) && data.length > 0) {
                console.log('First customer:', JSON.stringify(data[0], null, 2).substring(0, 500));
            }
        } else {
            const text = await response.text();
            console.log('\nError Response:', text.substring(0, 500));
        }
    } catch (error) {
        console.error('\nException:', error);
    }
}

testConnection();
