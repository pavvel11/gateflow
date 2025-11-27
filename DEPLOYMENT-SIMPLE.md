# GateFlow - Prosty Deploy (Używając Istniejącego Setup)

**TO JEST ZALECANA OPCJA** jeśli już testujesz `admin-panel/docker-compose.yml` na swoim serwerze!

## 📌 Przegląd

Używasz już `admin-panel/docker-compose.yml` do testów? Świetnie! Ten sam plik możesz użyć na produkcji. To najprostsze rozwiązanie.

### Co To Robi?

- Uruchamia **tylko Admin Panel** (1 kontener)
- Łączy się z **Supabase Cloud** (lub lokalnym Supabase)
- Nie wymaga nginxa (używasz swojego reverse proxy)
- Prosty, lekki, sprawdzony

## ✅ Wymagania

- VPS z Docker (min. 2GB RAM)
- Reverse proxy dla SSL (Nginx Proxy Manager, Caddy, Traefik)
- Konto Supabase Cloud (darmowe)
- Konto Stripe
- Domena

## 🚀 Krok po Kroku

### 1. Przygotuj Serwer

```bash
# Jeśli jeszcze nie masz Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Sklonuj projekt
cd /opt
git clone https://github.com/twoja-org/gateflow.git
cd gateflow/admin-panel
```

### 2. Utwórz Projekt w Supabase Cloud

1. Idź na https://supabase.com
2. Utwórz nowy projekt
3. Zapisz:
   - Project URL: `https://abcdef.supabase.co`
   - anon key: `eyJhbGci...`
   - service_role key: `eyJhbGci...`

### 3. Uruchom Migracje Bazy Danych

W Supabase Dashboard:

1. Przejdź do **SQL Editor**
2. Skopiuj zawartość `supabase/migrations/20250709000000_initial_schema.sql`
3. Wklej i uruchom
4. Powtórz dla wszystkich migracji

### 4. Skonfiguruj SMTP w Supabase

1. **Settings** → **Authentication** → **SMTP Settings**
2. Włącz Custom SMTP
3. Wypełnij danymi SendGrid/Mailgun

### 5. Utwórz Plik `.env`

```bash
cd /opt/gateflow/admin-panel
nano .env
```

Zawartość:

```env
# ===========================================
# GateFlow - Produkcja (admin-panel/docker-compose.yml)
# ===========================================

# App
APP_ENV=production
PORT=3000
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
NEXT_PUBLIC_BASE_URL=https://twoja-domena.pl
NEXT_PUBLIC_SITE_URL=https://twoja-domena.pl
MAIN_DOMAIN=twoja-domena.pl

# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### 6. Utwórz `.stripe` (Opcjonalne)

```bash
cp .stripe.example .stripe
nano .stripe
# Wypełnij według potrzeb
```

### 7. Uruchom Docker

```bash
# Zbuduj i uruchom
docker compose up -d

# Sprawdź logi
docker compose logs -f

# Sprawdź status
docker compose ps
```

Powinien działać na `http://localhost:3000`

### 8. Skonfiguruj Reverse Proxy dla SSL

#### Opcja A: Nginx Proxy Manager (Zalecane)

Jeśli już używasz NPM:

1. Dodaj **Proxy Host**:
   - Domain: `twoja-domena.pl`
   - Forward Hostname: `localhost` (lub IP serwera)
   - Forward Port: `3000`
   - Websockets: ✅
   - SSL: Request Let's Encrypt Certificate
   - Force SSL: ✅

#### Opcja B: Caddy

```bash
# Instalacja Caddy
sudo apt install -y caddy

# Konfiguracja
sudo nano /etc/caddy/Caddyfile
```

Zawartość:
```
twoja-domena.pl, www.twoja-domena.pl {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

### 9. Konfiguruj Stripe Webhooks

1. https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://twoja-domena.pl/api/webhooks/stripe`
3. Events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Skopiuj **Signing secret**
5. Dodaj do `.env` jako `STRIPE_WEBHOOK_SECRET`
6. Zrestartuj: `docker compose restart`

### 10. Pierwsze Logowanie

1. Otwórz: `https://twoja-domena.pl/login`
2. Wpisz email
3. Sprawdź email (magic link)
4. Kliknij link
5. Pierwsze konto = automatycznie admin! 🎉

## 🎯 Gotowe!

Twoja aplikacja działa na produkcji używając tego samego setupu co do testów!

## 📊 Monitoring

```bash
# Sprawdź logi
docker compose logs -f

# Sprawdź użycie zasobów
docker stats

# Sprawdź status
docker compose ps

# Test API
curl https://twoja-domena.pl/api/runtime-config
```

## 🔄 Aktualizacja

```bash
cd /opt/gateflow/admin-panel

# Zatrzymaj
docker compose down

# Pobierz zmiany
git pull

# Zbuduj ponownie
docker compose build --no-cache

# Uruchom
docker compose up -d

# Sprawdź logi
docker compose logs -f
```

## 🆘 Rozwiązywanie Problemów

### Problem: Kontener nie startuje

```bash
# Sprawdź logi szczegółowo
docker compose logs admin-panel

# Sprawdź czy .env jest poprawny
cat .env | grep SUPABASE_URL

# Zrestartuj
docker compose restart
```

### Problem: Nie mogę się zalogować

1. Sprawdź SMTP w Supabase Dashboard
2. Sprawdź logi Auth w Supabase
3. Sprawdź spam folder
4. Sprawdź `GOTRUE_URI_ALLOW_LIST` w Supabase Settings

### Problem: Stripe webhook nie działa

```bash
# Test endpoint
curl -X POST https://twoja-domena.pl/api/webhooks/stripe

# Sprawdź logi
docker compose logs admin-panel | grep stripe

# Sprawdź webhook secret w .env
grep STRIPE_WEBHOOK_SECRET .env
```

### Problem: 502 Bad Gateway

1. Sprawdź czy kontener działa: `docker compose ps`
2. Sprawdź czy port 3000 jest dostępny: `netstat -tlnp | grep 3000`
3. Sprawdź reverse proxy config

## 📁 Struktura Plików

```
/opt/gateflow/
├── admin-panel/
│   ├── docker-compose.yml  ← TEN PLIK UŻYWASZ
│   ├── .env                ← Twoja produkcyjna konfiguracja
│   ├── .stripe             ← Opcjonalna konfiguracja Stripe
│   ├── Dockerfile          ← Automatycznie używany przez docker-compose
│   └── src/
├── supabase/
│   └── migrations/         ← Migracje (uruchomione w Supabase Cloud)
└── ...
```

### 💡 O Dockerfile

Twój `admin-panel/Dockerfile` jest **poprawny i nie wymaga zmian**!

**Jak działa:**
- Next.js standalone czyta `NEXT_PUBLIC_*` zmienne w runtime z `.env`
- NIE potrzeba build args - zmienne są przekazywane podczas startu kontenera
- Jeśli zmienisz `.env`, wystarczy `docker compose restart` (bez rebuildu!)

**Node 20 vs Node 18:**
- Dockerfile używa Node 20 (najnowszy LTS) - to jest dobre! ✅
- Jeśli masz problem, możesz wrócić do Node 18 zmieniając pierwszą linię:
  ```dockerfile
  FROM node:18-alpine AS base
  ```

## 🔐 Bezpieczeństwo

Sprawdź przed startem:

- [ ] `.env` ma uprawnienia 600: `chmod 600 .env`
- [ ] `.env` NIE jest w Git
- [ ] SSL/HTTPS działa
- [ ] Firewall jest skonfigurowany (tylko 22, 80, 443)
- [ ] Hasła są długie i losowe
- [ ] Stripe webhooks mają secret
- [ ] Backupy Supabase są włączone (automatyczne w Cloud)

## 💰 Koszty Miesięczne

- **VPS** (2GB RAM): ~$5-10
- **Supabase Cloud Free**: $0 (do 500MB bazy)
- **Stripe**: 0% + 2.9% + $0.30 za transakcję
- **Domena**: ~$1/miesiąc

**Total**: ~$6-11/miesiąc

## 🎉 Zalety Tego Podejścia

✅ **Najprostszy** - używasz tego co już znasz
✅ **Sprawdzony** - testujesz to już lokalnie
✅ **Lekki** - tylko 1 kontener
✅ **Tani** - minimalne zasoby
✅ **Łatwa aktualizacja** - git pull + rebuild
✅ **Supabase Cloud** - automatyczne backupy i monitoring

## 📚 Inne Opcje Deployment

Jeśli potrzebujesz więcej kontroli:

- **`docker-compose.fullstack.yml`**: Pełny self-hosted stack (11 kontenerów)
  - Dla enterprise, compliance (GDPR data residency), high traffic
  - Zobacz: **`DEPLOYMENT.md`**

- **`DOCKER-COMPOSE-GUIDE.md`**: Porównanie wszystkich opcji deployment

---

**Pytania? Otwórz issue na GitHubie!**
