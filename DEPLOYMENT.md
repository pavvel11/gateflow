# 🚀 Uruchom GateFlow w 15 minut

Prosty przewodnik jak uruchomić GateFlow na **mikr.us** (lub dowolnym VPS z Ubuntu).

## 📦 Co potrzebujesz?

- **VPS** z Ubuntu (przykład: mikr.us 2048 MB = 15 zł/mies)
- **Domena** (~10 zł/rok)
- **Konto Stripe** (darmowe, test mode)
- **Konto Supabase** (darmowe, do 500MB)
- **15 minut czasu**

---

## Krok 1: Wynajmij VPS

### mikr.us (Rekomendowane dla Polski)

1. Idź na **https://mikr.us**
2. Wybierz: **MIKRUS 2048 MB** (15 zł/mies)
3. System: **Ubuntu 24.04**
4. Otrzymasz:
   - IP serwera: `123.45.67.89`
   - Login SSH: `root`
   - Hasło: (w emailu)

5. Zaloguj się:
```bash
ssh root@123.45.67.89
# Wpisz hasło z emaila
```

### Inne VPS (Digital Ocean, Hetzner, OVH)

Działa na dowolnym VPS z **Ubuntu 22.04+** i minimum **2GB RAM**.

```bash
# Po zalogowaniu, zaktualizuj system:
apt update && apt upgrade -y
```

---

## Krok 2: Zainstaluj Docker

Jedna komenda instaluje wszystko:

```bash
curl -fsSL https://get.docker.com | sh
```

Sprawdź czy działa:
```bash
docker --version
# Powinno pokazać: Docker version 27.x.x
```

---

## Krok 3: Pobierz GateFlow

```bash
cd ~
git clone https://github.com/pavvel11/gateflow.git
cd gateflow/admin-panel
```

---

## Krok 4: Konfiguracja (5 minut)

### 4.1. Utwórz darmowe konto Supabase

1. Idź na **https://supabase.com**
2. Kliknij **Start your project**
3. Utwórz nowy projekt
4. Zapisz:
   - **Project URL**: `https://abcdefgh.supabase.co`
   - **anon public key**: `eyJhbGci...` (z Settings → API)
   - **service_role key**: `eyJhbGci...` (z Settings → API)

### 4.2. Uruchom migracje w Supabase

1. W Supabase Dashboard → **SQL Editor**
2. Otwórz każdy plik z `gateflow/supabase/migrations/` i wykonaj po kolei:
   - `20250709160000_initial_schema.sql`
   - `20250717120000_complete_payment_system.sql`
   - `20251128141050_video_views_tracking.sql`
   - `20251128150000_order_bumps.sql`
   - (... i wszystkie pozostałe w kolejności chronologicznej)

### 4.3. Skonfiguruj SMTP w Supabase

1. **Settings** → **Authentication** → **SMTP Settings**
2. Enable Custom SMTP
3. Wypełnij danymi (przykład SendGrid):
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: `SG.twoj-klucz-sendgrid`

### 4.4. Utwórz plik .env

```bash
cp .env.example .env.local
nano .env.local
```

**Wypełnij tylko najważniejsze:**

```env
# ===========================================
# SUPABASE (skopiuj z supabase.com/dashboard)
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ===========================================
# STRIPE (test mode - dashboard.stripe.com/test/apikeys)
# ===========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Skonfigurujesz w kroku 7

# ===========================================
# TWOJA DOMENA
# ===========================================
NEXT_PUBLIC_SITE_URL=https://twoja-domena.pl
NEXT_PUBLIC_BASE_URL=https://twoja-domena.pl
MAIN_DOMAIN=twoja-domena.pl

# ===========================================
# CLOUDFLARE TURNSTILE (opcjonalne - dla CAPTCHA)
# ===========================================
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# ===========================================
# INNE (możesz zostawić domyślne)
# ===========================================
APP_ENV=production
NODE_ENV=production
PORT=3000
```

Zapisz: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Krok 5: Uruchom GateFlow

```bash
docker compose up -d
```

Sprawdź czy działa:
```bash
docker compose ps
# Powinno pokazać: admin-panel running

curl localhost:3000
# Powinno zwrócić HTML
```

Zobacz logi:
```bash
docker compose logs -f
```

---

## Krok 6: Skonfiguruj domenę + SSL (5 minut)

### Opcja A: Caddy (NAJPROSTE - auto SSL)

```bash
# Zainstaluj Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Skonfiguruj
sudo nano /etc/caddy/Caddyfile
```

Wklej (zamień `twoja-domena.pl` na swoją):
```
twoja-domena.pl, www.twoja-domena.pl {
    reverse_proxy localhost:3000
}
```

Zrestartuj:
```bash
sudo systemctl restart caddy
```

**Gotowe!** Caddy automatycznie pobierze certyfikat SSL z Let's Encrypt.

### Opcja B: Nginx Proxy Manager (GUI)

Jeśli wolisz GUI:

1. Zainstaluj NPM: https://nginxproxymanager.com/guide/#quick-setup
2. Dodaj Proxy Host:
   - Domain: `twoja-domena.pl`
   - Forward Host: `localhost`
   - Forward Port: `3000`
   - SSL: Request Let's Encrypt Certificate

### Konfiguracja DNS

W swoim dostawcy domeny (np. OVH, Cloudflare) dodaj rekordy:

```
Typ    Nazwa    Wartość (IP VPS)      TTL
A      @        123.45.67.89          3600
A      www      123.45.67.89          3600
```

Poczekaj 5-15 minut na propagację DNS.

---

## Krok 7: Konfiguracja Stripe Webhooks

1. Idź na **https://dashboard.stripe.com/test/webhooks**
2. Kliknij **Add endpoint**
3. URL: `https://twoja-domena.pl/api/webhooks/stripe`
4. Wybierz zdarzenia:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Kliknij **Add endpoint**
6. Skopiuj **Signing secret** (`whsec_...`)
7. Dodaj do `.env.local`:
   ```bash
   nano .env.local
   # Zaktualizuj linię:
   STRIPE_WEBHOOK_SECRET=whsec_twój_secret
   ```
8. Zrestartuj:
   ```bash
   docker compose restart
   ```

---

## ✅ Gotowe! Pierwsze logowanie

1. Otwórz **https://twoja-domena.pl/login**
2. Wpisz swój email
3. Kliknij **Send Magic Link**
4. Sprawdź email i kliknij link
5. **Pierwsze konto automatycznie dostaje uprawnienia admina!** 🎉

---

## 🎯 Co dalej?

### Przetestuj płatności

1. Przejdź do **Dashboard** → **Products**
2. Utwórz testowy produkt (np. 10 PLN)
3. Wejdź na stronę produktu
4. Użyj karty testowej Stripe: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
5. Sprawdź w Dashboard → Payments czy płatność przeszła

### Skonfiguruj Stripe przez GUI (opcjonalne)

Zamiast `STRIPE_SECRET_KEY` w `.env`, możesz użyć kreatora:

1. Wygeneruj klucz szyfrowania:
   ```bash
   openssl rand -base64 32
   ```
2. Dodaj do `.env.local`:
   ```
   STRIPE_ENCRYPTION_KEY=twój_wygenerowany_klucz
   ```
3. W Dashboard → **Settings** → kliknij **Configure Stripe**
4. Przejdź przez kreator (5 kroków)

Więcej w: `/STRIPE-TESTING-GUIDE.md`

### Przejdź na Live Mode (produkcja)

Gdy jesteś gotowy na prawdziwe płatności:

1. W Stripe Dashboard przełącz się na **Live Mode**
2. Pobierz live keys: `pk_live_...` i `sk_live_...`
3. Zaktualizuj `.env.local`
4. Utwórz nowy webhook endpoint dla live mode
5. Zrestartuj: `docker compose restart`

---

## 🆘 Najczęstsze Problemy

### 1. Kontener nie startuje

```bash
# Sprawdź logi
docker compose logs admin-panel

# Najczęstsze przyczyny:
# - Błędny .env.local (sprawdź SUPABASE_URL)
# - Brak miejsca na dysku (df -h)
# - Port 3000 zajęty (netstat -tlnp | grep 3000)
```

### 2. Nie mogę się zalogować (magic link nie działa)

```bash
# 1. Sprawdź czy SMTP jest skonfigurowany w Supabase:
#    Settings → Authentication → SMTP Settings

# 2. Sprawdź spam folder

# 3. Sprawdź logi w Supabase Dashboard:
#    Authentication → Logs
```

### 3. Stripe webhook nie działa

```bash
# Sprawdź czy webhook secret jest poprawny
grep STRIPE_WEBHOOK_SECRET .env.local

# Sprawdź logi
docker compose logs admin-panel | grep stripe

# Test endpoint
curl -X POST https://twoja-domena.pl/api/webhooks/stripe
```

### 4. 502 Bad Gateway

```bash
# Sprawdź czy kontener działa
docker compose ps

# Sprawdź czy port 3000 odpowiada
curl localhost:3000

# Zrestartuj Caddy
sudo systemctl restart caddy

# Sprawdź logi Caddy
sudo journalctl -u caddy -f
```

### 5. Brak miejsca na dysku

```bash
# Sprawdź miejsce
df -h

# Wyczyść Docker
docker system prune -a -f

# Wyczyść stare logi
docker compose logs --tail=0
```

---

## 🔄 Aktualizacja GateFlow

```bash
cd ~/gateflow

# Zatrzymaj
docker compose down

# Backup bazy (WAŻNE!)
# Supabase Cloud robi automatyczne backupy, ale możesz też:
# Settings → Database → Backups → Create backup

# Pobierz zmiany
git pull origin main

# Przebuduj i uruchom
cd admin-panel
docker compose build --no-cache
docker compose up -d

# Sprawdź logi
docker compose logs -f
```

### Nowe migracje bazy danych

Jeśli są nowe pliki w `supabase/migrations/`:

1. Otwórz Supabase Dashboard → SQL Editor
2. Wykonaj nowe migracje w kolejności chronologicznej

---

## 💰 Koszty Miesięczne

| Usługa | Koszt |
|--------|-------|
| mikr.us VPS 2048MB | 15 zł |
| Domena .pl | ~1 zł |
| Supabase Cloud (Free) | 0 zł (do 500MB) |
| Stripe | 0 zł + 2.9% + 1.20 zł za transakcję |
| **Total** | **~16 zł/mies** |

---

## 📚 Zaawansowane Opcje

Jeśli potrzebujesz więcej kontroli lub specyficznych konfiguracji:

- **Full Self-Hosted Stack** (bez Supabase Cloud, GDPR compliance)
  → Zobacz `deployment/advanced/FULL-STACK.md`

- **PM2 bez Dockera** (dla expert Node.js developerów)
  → Zobacz `deployment/advanced/PM2-VPS.md`

- **Docker + Supabase Cloud (szczegóły)**
  → Zobacz `deployment/advanced/DOCKER-SIMPLE.md`

---

## 🛡️ Bezpieczeństwo - Checklist

Przed uruchomieniem na produkcji:

- [ ] Zmień Stripe keys z test na live (`pk_live_`, `sk_live_`)
- [ ] `.env.local` ma uprawnienia 600: `chmod 600 .env.local`
- [ ] `.env.local` NIE jest w Git
- [ ] SSL/HTTPS działa (zielona kłódka w przeglądarce)
- [ ] Firewall skonfigurowany (tylko porty 22, 80, 443):
  ```bash
  sudo ufw enable
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  ```
- [ ] Backupy Supabase włączone (Settings → Database → Backups)
- [ ] Testowa płatność przeszła pomyślnie

---

## 🎉 Gratulacje!

**GateFlow działa na produkcji!**

Pytania? Problemy? Otwórz issue na GitHubie:
→ https://github.com/pavvel11/gateflow/issues

---

**Made with ❤️ by [GateFlow Team](https://github.com/pavvel11/gateflow)**
