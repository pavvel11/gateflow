# GateFlow - Instrukcja Wdrożenia Produkcyjnego

Pełna instrukcja wdrożenia GateFlow na serwerze produkcyjnym za pomocą Docker Compose.

## Spis Treści

1. [Wymagania](#wymagania)
2. [Przygotowanie Serwera](#przygotowanie-serwera)
3. [Konfiguracja Zmiennych Środowiskowych](#konfiguracja-zmiennych-środowiskowych)
4. [Konfiguracja Bazy Danych](#konfiguracja-bazy-danych)
5. [Uruchomienie Aplikacji](#uruchomienie-aplikacji)
6. [Konfiguracja Domeny i SSL](#konfiguracja-domeny-i-ssl)
7. [Konfiguracja Stripe Webhooks](#konfiguracja-stripe-webhooks)
8. [Pierwsza Konfiguracja](#pierwsza-konfiguracja)
9. [Monitorowanie i Logi](#monitorowanie-i-logi)
10. [Aktualizacja](#aktualizacja)
11. [Backup i Przywracanie](#backup-i-przywracanie)
12. [Rozwiązywanie Problemów](#rozwiązywanie-problemów)

## Wymagania

### Minimalne Wymagania Sprzętowe
- **CPU**: 2 vCPU
- **RAM**: 4 GB (zalecane: 8 GB)
- **Dysk**: 20 GB SSD (zalecane: 50 GB)
- **Transfer**: 100 GB/miesiąc

### Oprogramowanie
- **System Operacyjny**: Ubuntu 22.04 LTS lub nowszy (zalecane)
- **Docker**: wersja 24.0 lub nowsza
- **Docker Compose**: wersja 2.20 lub nowsza
- **Git**: do pobrania kodu

### Zewnętrzne Usługi
- **Domena**: własna domena z dostępem do DNS
- **SMTP**: usługa email (SendGrid, AWS SES, Mailgun, itp.)
- **Stripe**: konto produkcyjne
- **Cloudflare Turnstile**: konto (opcjonalne, dla CAPTCHA)

## Przygotowanie Serwera

### 1. Aktualizacja Systemu

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalacja Docker

```bash
# Usuń stare wersje
sudo apt remove docker docker-engine docker.io containerd runc

# Instalacja zależności
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Dodaj oficjalny klucz GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Dodaj repozytorium Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalacja Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Weryfikacja instalacji
docker --version
docker compose version
```

### 3. Konfiguracja Docker (opcjonalne, ale zalecane)

```bash
# Dodaj użytkownika do grupy docker (uniknięcie sudo)
sudo usermod -aG docker $USER

# Zaloguj się ponownie lub:
newgrp docker

# Skonfiguruj Docker do automatycznego startu
sudo systemctl enable docker
sudo systemctl start docker
```

### 4. Instalacja Git

```bash
sudo apt install -y git
```

### 5. Konfiguracja Firewall

```bash
# Włącz UFW
sudo ufw enable

# Zezwól na SSH
sudo ufw allow 22/tcp

# Zezwól na HTTP i HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Sprawdź status
sudo ufw status
```

## Konfiguracja Zmiennych Środowiskowych

### 1. Pobierz Kod Źródłowy

```bash
# Przejdź do katalogu domowego
cd ~

# Sklonuj repozytorium
git clone https://github.com/twoja-organizacja/gateflow.git
cd gateflow
```

### 2. Utwórz Plik Konfiguracyjny

```bash
# Skopiuj przykładowy plik
cp .env.production.example .env.production

# Edytuj plik
nano .env.production
```

### 3. Wygeneruj Bezpieczne Klucze

```bash
# Generowanie JWT_SECRET
openssl rand -base64 32

# Generowanie REALTIME_SECRET_KEY_BASE
openssl rand -base64 32

# Generowanie POSTGRES_PASSWORD (długie hasło)
openssl rand -base64 48
```

### 4. Wypełnij Wszystkie Zmienne

Poniżej znajdziesz szczegółowy opis każdej zmiennej:

#### Baza Danych
```env
POSTGRES_PASSWORD=twoje_bardzo_bezpieczne_haslo_postgresql
```

#### JWT i Autoryzacja
```env
JWT_SECRET=wklej_wygenerowany_jwt_secret
REALTIME_SECRET_KEY_BASE=wklej_wygenerowany_realtime_secret
ANON_KEY=pobierz_z_supabase_dashboard
SERVICE_ROLE_KEY=pobierz_z_supabase_dashboard
```

**Uwaga**: Klucze `ANON_KEY` i `SERVICE_ROLE_KEY` można wygenerować w Supabase Dashboard lub użyć narzędzia do generowania JWT z odpowiednim secretem.

#### URL-e i Domeny
```env
API_EXTERNAL_URL=https://api.twoja-domena.pl
NEXT_PUBLIC_SUPABASE_URL=https://api.twoja-domena.pl
GOTRUE_SITE_URL=https://twoja-domena.pl
NEXT_PUBLIC_SITE_URL=https://twoja-domena.pl
NEXT_PUBLIC_BASE_URL=https://twoja-domena.pl
MAIN_DOMAIN=twoja-domena.pl
GOTRUE_URI_ALLOW_LIST=https://twoja-domena.pl/*,https://www.twoja-domena.pl/*
```

#### SMTP (Email)
Przykład dla SendGrid:
```env
SMTP_ADMIN_EMAIL=noreply@twoja-domena.pl
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_SENDER_NAME=GateFlow
```

Przykład dla Gmail:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=twoje-haslo-aplikacji
```

#### Stripe
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### Cloudflare Turnstile (CAPTCHA)
```env
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### 5. Konfiguracja Stripe w Admin Panel

Utwórz plik `.stripe` w katalogu `admin-panel/`:

```bash
cd admin-panel
cp .stripe.example .stripe
nano .stripe
```

Wypełnij zgodnie z dokumentacją Stripe.

## Konfiguracja Bazy Danych

### 1. Przygotuj Migracje

Sprawdź, czy wszystkie migracje są w miejscu:

```bash
ls -la supabase/migrations/
```

Powinny być pliki:
- `20250709000000_initial_schema.sql`
- `20250717000000_payment_system.sql`
- inne...

### 2. Opcjonalnie: Zmodyfikuj Seed Data

Jeśli chcesz mieć własne przykładowe dane:

```bash
nano supabase/seed.sql
```

## Uruchomienie Aplikacji

### 1. Zbuduj i Uruchom Kontenery

```bash
# Upewnij się, że jesteś w głównym katalogu projektu
cd ~/gateflow

# Zbuduj obrazy (może zająć kilka minut przy pierwszym uruchomieniu)
docker compose build

# Uruchom wszystkie usługi
docker compose up -d

# Sprawdź status kontenerów
docker compose ps
```

Oczekiwany output:
```
NAME                  STATUS              PORTS
gateflow-admin        running             0.0.0.0:3000->3000/tcp
gateflow-db           running (healthy)   0.0.0.0:5432->5432/tcp
gateflow-auth         running
gateflow-rest         running
gateflow-storage      running
gateflow-nginx        running             0.0.0.0:8080->80/tcp
...
```

### 2. Sprawdź Logi

```bash
# Wszystkie kontenery
docker compose logs -f

# Konkretny kontener
docker compose logs -f admin-panel
docker compose logs -f db
```

### 3. Zainicjalizuj Bazę Danych

Jeśli baza została automatycznie zainicjalizowana (migracje w `/docker-entrypoint-initdb.d`), możesz pominąć ten krok. W przeciwnym razie:

```bash
# Połącz się z bazą
docker compose exec db psql -U postgres

# Sprawdź tabele
\dt

# Wyjdź
\q
```

Jeśli tabele nie istnieją, uruchom migracje ręcznie:

```bash
# Skopiuj migracje do kontenera
docker compose cp supabase/migrations/. db:/tmp/migrations/

# Wykonaj migracje
docker compose exec db psql -U postgres -d postgres -f /tmp/migrations/20250709000000_initial_schema.sql
docker compose exec db psql -U postgres -d postgres -f /tmp/migrations/20250717000000_payment_system.sql
```

## Konfiguracja Domeny i SSL

### Opcja 1: Nginx Proxy Manager (Zalecane dla początkujących)

1. Zainstaluj Nginx Proxy Manager:
```bash
# Utwórz osobny katalog
mkdir ~/nginx-proxy-manager
cd ~/nginx-proxy-manager

# Pobierz docker-compose.yml dla NPM
wget https://github.com/NginxProxyManager/nginx-proxy-manager/blob/main/docker-compose.yml

# Uruchom
docker compose up -d
```

2. Zaloguj się do panelu: `http://twoj-serwer:81`
   - Email: `admin@example.com`
   - Hasło: `changeme`

3. Dodaj Proxy Host:
   - Domain: `twoja-domena.pl`
   - Forward Hostname: `admin-panel`
   - Forward Port: `3000`
   - Websockets: ✅
   - SSL: Wybierz "Request a new SSL Certificate" (Let's Encrypt)

4. Dodaj drugi Proxy Host dla API:
   - Domain: `api.twoja-domena.pl`
   - Forward Hostname: `kong`
   - Forward Port: `8000`
   - SSL: ✅

5. Dodaj trzeci Proxy Host dla przykładów:
   - Domain: `examples.twoja-domena.pl` (opcjonalne)
   - Forward Hostname: `nginx`
   - Forward Port: `80`
   - SSL: ✅

### Opcja 2: Certbot + Nginx (Dla zaawansowanych)

```bash
# Instalacja Certbot
sudo apt install -y certbot python3-certbot-nginx

# Uzyskaj certyfikat
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl -d api.twoja-domena.pl

# Automatyczne odnawianie
sudo systemctl enable certbot.timer
```

### Konfiguracja DNS

Ustaw rekordy DNS w swoim dostawcy:

```
Typ    Nazwa    Wartość              TTL
A      @        IP_TWOJEGO_SERWERA   3600
A      www      IP_TWOJEGO_SERWERA   3600
A      api      IP_TWOJEGO_SERWERA   3600
```

## Konfiguracja Stripe Webhooks

### 1. Utwórz Webhook Endpoint w Stripe Dashboard

1. Przejdź do: https://dashboard.stripe.com/webhooks
2. Kliknij "Add endpoint"
3. URL: `https://twoja-domena.pl/api/webhooks/stripe`
4. Wybierz zdarzenia:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Zapisz i skopiuj **Signing secret** (`whsec_...`)

### 2. Zaktualizuj Zmienne Środowiskowe

```bash
nano .env.production
```

Dodaj/zaktualizuj:
```env
STRIPE_WEBHOOK_SECRET=whsec_twoj_webhook_secret
```

Zrestartuj aplikację:
```bash
docker compose restart admin-panel
```

## Pierwsza Konfiguracja

### 1. Utwórz Pierwsze Konto Administratora

1. Przejdź do: `https://twoja-domena.pl/login`
2. Wpisz swój email
3. Kliknij "Send Magic Link"
4. Sprawdź skrzynkę email i kliknij link
5. Pierwsze konto automatycznie dostaje uprawnienia administratora!

### 2. Przetestuj Dashboard

1. Po zalogowaniu przejdź do: `https://twoja-domena.pl/dashboard`
2. Sprawdź sekcję Admin: `https://twoja-domena.pl/admin/products`
3. Utwórz pierwszy produkt testowy

### 3. Przetestuj Płatność

1. Utwórz produkt z ceną testową (np. 10 PLN)
2. Przejdź na stronę produktu: `https://twoja-domena.pl/p/slug-produktu`
3. Użyj testowej karty Stripe: `4242 4242 4242 4242`
4. Zweryfikuj, że płatność przeszła

## Monitorowanie i Logi

### Sprawdzanie Statusu

```bash
# Status wszystkich kontenerów
docker compose ps

# Użycie zasobów
docker stats

# Logi w czasie rzeczywistym
docker compose logs -f

# Logi konkretnej usługi
docker compose logs -f admin-panel
docker compose logs -f db
```

### Logi Aplikacji

Logi są dostępne w kontenerach:

```bash
# Admin Panel
docker compose exec admin-panel sh
ls -la /app/.next/

# Baza danych - logi PostgreSQL
docker compose logs db | grep ERROR

# Nginx
docker compose logs nginx
```

### Monitorowanie Bazy Danych

```bash
# Połącz się z bazą
docker compose exec db psql -U postgres

# Sprawdź rozmiar bazy
SELECT pg_size_pretty(pg_database_size('postgres'));

# Sprawdź aktywne połączenia
SELECT count(*) FROM pg_stat_activity;

# Sprawdź najpopularniejsze zapytania
SELECT query, calls, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

## Aktualizacja

### Aktualizacja Kodu

```bash
# Przejdź do katalogu projektu
cd ~/gateflow

# Zatrzymaj aplikację
docker compose down

# Pobierz najnowszy kod
git pull origin main

# Przebuduj obrazy
docker compose build --no-cache

# Uruchom ponownie
docker compose up -d

# Sprawdź logi
docker compose logs -f admin-panel
```

### Aktualizacja Bazy Danych (Migracje)

```bash
# Nowa migracja pojawi się w supabase/migrations/
ls -la supabase/migrations/

# Wykonaj migrację
docker compose exec db psql -U postgres -d postgres -f /tmp/migrations/NOWA_MIGRACJA.sql
```

### Backup Przed Aktualizacją

**ZAWSZE rób backup przed aktualizacją!**

```bash
# Backup bazy danych
docker compose exec db pg_dump -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup volumes
docker run --rm \
  -v gateflow_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

## Backup i Przywracanie

### Automatyczny Backup Bazy Danych

Utwórz skrypt backup:

```bash
nano ~/backup-gateflow.sh
```

Zawartość:
```bash
#!/bin/bash
BACKUP_DIR="/home/$(whoami)/backups/gateflow"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup bazy danych
docker compose -f /home/$(whoami)/gateflow/docker-compose.yml \
  exec -T db pg_dump -U postgres postgres | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Usuń stare backupy (starsze niż 7 dni)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

Ustaw uprawnienia i cron:
```bash
chmod +x ~/backup-gateflow.sh

# Dodaj do crona (backup codziennie o 2:00)
crontab -e

# Dodaj linię:
0 2 * * * /home/twojanazwa/backup-gateflow.sh >> /home/twojanazwa/backup-gateflow.log 2>&1
```

### Przywracanie z Backupu

```bash
# Zatrzymaj aplikację
cd ~/gateflow
docker compose down

# Przywróć bazę danych
gunzip -c ~/backups/gateflow/db_20250126_020000.sql.gz | \
  docker compose run --rm -T db psql -U postgres

# Uruchom ponownie
docker compose up -d
```

### Backup Plików

```bash
# Backup volumes (storage, uploads, etc.)
docker run --rm \
  -v gateflow_storage_data:/data \
  -v ~/backups/gateflow:/backup \
  alpine tar czf /backup/storage_$(date +%Y%m%d).tar.gz /data
```

## Rozwiązywanie Problemów

### Problem: Kontenery nie startują

```bash
# Sprawdź logi
docker compose logs

# Sprawdź konfigurację
docker compose config

# Usuń wszystko i zacznij od nowa
docker compose down -v
docker compose up -d
```

### Problem: Baza danych nie odpowiada

```bash
# Sprawdź status
docker compose ps db

# Sprawdź logi
docker compose logs db

# Zrestartuj bazę
docker compose restart db

# Jeśli to nie pomoże, sprawdź wolne miejsce
df -h
```

### Problem: Admin Panel zwraca 500

```bash
# Sprawdź logi
docker compose logs admin-panel

# Sprawdź zmienne środowiskowe
docker compose exec admin-panel env | grep SUPABASE

# Zrestartuj panel
docker compose restart admin-panel
```

### Problem: Magic link nie działa

1. Sprawdź konfigurację SMTP:
```bash
docker compose logs auth | grep SMTP
```

2. Sprawdź `GOTRUE_URI_ALLOW_LIST` w `.env.production`

3. Sprawdź czy email dotarł (sprawdź spam)

### Problem: Płatności Stripe nie działają

1. Sprawdź webhook secret:
```bash
docker compose exec admin-panel env | grep STRIPE
```

2. Sprawdź logi webhooków w Stripe Dashboard

3. Przetestuj endpoint ręcznie:
```bash
curl -X POST https://twoja-domena.pl/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{}'
```

### Problem: Brak miejsca na dysku

```bash
# Sprawdź miejsce
df -h

# Usuń nieużywane obrazy
docker image prune -a

# Usuń nieużywane volumes
docker volume prune

# Usuń stare logi
docker compose logs --tail=0
```

### Problem: Zbyt wolne działanie

1. Sprawdź użycie zasobów:
```bash
docker stats
```

2. Dodaj więcej RAM lub CPU w ustawieniach serwera

3. Optymalizuj bazę danych:
```bash
docker compose exec db psql -U postgres -c "VACUUM ANALYZE;"
```

4. Dodaj indeksy do często używanych kolumn

## Wsparcie i Dokumentacja

- **Dokumentacja GateFlow**: `/CLAUDE.md` w repozytorium
- **Dokumentacja Docker**: https://docs.docker.com/
- **Dokumentacja Supabase**: https://supabase.com/docs
- **Dokumentacja Stripe**: https://stripe.com/docs
- **GitHub Issues**: [link do repozytorium]

## Bezpieczeństwo - Checklist

Po wdrożeniu sprawdź:

- [ ] Wszystkie hasła są długie i bezpieczne
- [ ] `.env.production` NIE jest w repozytorium Git
- [ ] Firewall jest skonfigurowany (tylko porty 22, 80, 443)
- [ ] SSL/TLS jest włączony (HTTPS)
- [ ] Backupy są skonfigurowane i testowane
- [ ] SMTP używa szyfrowanego połączenia
- [ ] Stripe jest w trybie produkcyjnym (klucze `pk_live_` i `sk_live_`)
- [ ] Rate limiting jest włączony
- [ ] Logi nie zawierają wrażliwych danych
- [ ] Monitorowanie jest skonfigurowane

---

**Gratulacje! GateFlow jest teraz uruchomiony produkcyjnie!** 🎉
