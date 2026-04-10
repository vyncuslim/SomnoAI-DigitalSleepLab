async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/2fa/setup', { method: 'POST' });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
