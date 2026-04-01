const { Client } = require('pg');

async function run() {
  const client = new Client('postgres://postgres:postgres@localhost:5432/paper_market');
  await client.connect();
  const res = await client.query(`
    SELECT tradingsymbol, "instrumentToken"
    FROM instruments 
    WHERE tradingsymbol IN ('RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS', 'BHARTIARTL', 'ITC', 'LT', 'SBIN', 'KOTAKBANK', 'BAJFINANCE', 'AXISBANK', 'WIPRO', 'HCLTECH', 'ADANIENT', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'ONGC') 
    AND exchange = 'NSE' AND "instrumentType" = 'EQ'
  `);
  console.log("=== DB DUMP ===");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();
