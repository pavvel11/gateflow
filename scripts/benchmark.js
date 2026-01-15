const autocannon = require('autocannon');

const url = process.argv[2] || 'http://localhost:3000';
const duration = 10; // sekundy
const connections = 50; // ilu "wirtualnych użytkowników" naraz

console.log(`🚀 Startuję benchmark dla: ${url}`);
console.log(`⏱️  Czas trwania: ${duration}s`);
console.log(`👥 Symulacja: ${connections} użytkowników jednocześnie...\n`);

const instance = autocannon({
  url,
  connections, // liczba jednoczesnych połączeń
  duration,    // czas trwania testu w sekundach
  pipelining: 1, // ile requestów naraz w jednym połączeniu
  workers: 1,    // worker threads
}, finishedBench);

autocannon.track(instance, { renderProgressBar: true });

function finishedBench(err, res) {
  if (err) {
    console.error('❌ Błąd krytyczny testu:', err);
    return;
  }

  console.log('\n📊 --- WYNIKI TESTU --- 📊\n');

  // 1. Latency (Opóźnienie)
  const avgLatency = res.latency.average;
  const p99Latency = res.latency.p99;
  
  console.log(`🕒 Opóźnienie (Latency):`);
  console.log(`   - Średnie: ${avgLatency.toFixed(2)} ms ${evaluateLatency(avgLatency)}`);
  console.log(`   - 99% userów czeka krócej niż: ${p99Latency.toFixed(2)} ms`);

  // 2. Throughput (Przepustowość)
  const reqPerSec = res.requests.average;
  console.log(`\n🚀 Przepustowość (Throughput):`);
  console.log(`   - Obsłużono: ${reqPerSec.toFixed(0)} req/sec`);
  console.log(`   - Łącznie requestów: ${res.requests.total}`);

  // 3. Błędy
  const errors = res.errors + res.timeouts;
  console.log(`\n⚠️  Błędy:`);
  if (errors === 0) {
    console.log(`   - ✅ BRAK BŁĘDÓW (0 timeouts, 0 socket errors)`);
  } else {
    console.log(`   - ❌ WYKRYTO BŁĘDY: ${errors} (Timeouts: ${res.timeouts})`);
  }

  console.log('\n--------------------------');
  
  // Werdykt
  if (errors > 0) {
    console.log('🏁 WERDYKT: 🔴 OBLANY (Wystąpiły błędy)');
  } else if (avgLatency > 1000) {
    console.log('🏁 WERDYKT: 🟠 OSTRZEŻENIE (Bardzo wolno > 1s)');
  } else if (avgLatency > 300) {
    console.log('🏁 WERDYKT: 🟡 ŚREDNIO (Akceptowalnie, ale do poprawy)');
  } else {
    console.log('🏁 WERDYKT: 🟢 ŚWIETNIE (Szybko i stabilnie)');
  }
}

function evaluateLatency(ms) {
  if (ms < 100) return '🚀 (Błyskawica)';
  if (ms < 300) return '✅ (Szybko)';
  if (ms < 1000) return '⚠️ (Odczuwalne opóźnienie)';
  return '🐌 (Bardzo wolno)';
}
