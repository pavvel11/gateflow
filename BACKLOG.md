# GateFlow - Product Backlog

Lista pomysłów i planowanych funkcjonalności do rozwoju platformy.

## 🎥 Video & Media

### 🟢 High Priority

#### Bunny.net Video Embed Integration
**Status**: ✅ Done (2025-11-27)
**Opis**: Podstawowa integracja - możliwość embedowania video z Bunny.net przez iframe
**Zaimplementowane**:
- ✅ Inteligentny parser video URLs (`videoUtils.ts`)
- ✅ Automatyczna konwersja YouTube watch URLs → embed URLs
- ✅ Wsparcie dla Bunny.net (iframe.mediadelivery.net)
- ✅ Wsparcie dla Vimeo, Loom, Wistia, DailyMotion, Twitch
- ✅ Platform badges na video playerze
- ✅ Zabezpieczenia - tylko trusted platforms
- ✅ Lepsze error messages z wyświetlaniem błędnego URL
- ✅ Helpful hints w formularzu produktu

**Rozwiązane problemy**:
- ✅ YouTube embeds (`www.youtube.com refused to connect`) - teraz automatycznie konwertujemy do embed URL
- ✅ Wsparcie dla różnych formatów YouTube URL (watch, youtu.be, embed, mobile)
- ✅ Bunny.net działa out-of-the-box

---

### 🟡 Medium Priority

#### Pełna Integracja z Bunny.net API
**Status**: 📋 Planned
**Opis**: Upload filmów bezpośrednio z admin panelu GateFlow do Bunny.net
**Wymagania**:
- Konfiguracja Bunny.net API key w admin panelu
- Upload interface w admin panelu
- Progress bar podczas uploadu
- Automatyczne generowanie embed code
- Zarządzanie biblioteką video (lista, edycja, usuwanie)

**Techniczne**:
- Nowa sekcja w Settings: "Video Hosting"
- Integracja z Bunny.net Stream API
- Pole w bazie: `bunny_api_key` (encrypted)
- Video library management UI

**API Endpoints potrzebne**:
- `POST /api/admin/video/upload` - upload do Bunny.net
- `GET /api/admin/video/list` - lista filmów
- `DELETE /api/admin/video/:id` - usuwanie filmu

---

#### Zaawansowana Stylizacja Video Player (inspiracja: PrestoPlayer)
**Status**: 📋 Planned
**Opis**: Customizacja wyglądu i funkcji video playera

**Funkcje**:
- 🎨 **Custom Styling**:
  - Wybór kolorów UI playera
  - Custom przyciski play/pause
  - Logo overlay na video
  - Custom progress bar

- ⚙️ **Player Controls**:
  - Włączanie/wyłączanie kontrolek
  - Auto-play configuration
  - Playback speed control
  - Picture-in-Picture
  - Fullscreen options

- 🎯 **Overlays & CTAs**:
  - Text overlays na określonych momentach
  - CTA buttons (np. "Kup teraz" na minute 5:00)
  - Email capture overlay (lead generation)
  - Custom thumbnail przed odtworzeniem

- 📊 **Analytics**:
  - Tracking % obejrzenia filmu
  - Heat maps (które momenty są najczęściej przewijane)
  - Drop-off points
  - Engagement metrics

**UI w Admin Panelu**:
- Visual player customizer
- Timeline editor dla overlays
- Preview przed zapisaniem

**Inspiracja**: https://prestoplayer.com/

---

### 🔵 Low Priority

#### Hostowanie Plików w Aplikacji
**Status**: 💭 Idea
**Opis**: Możliwość uploadowania i hostowania plików bezpośrednio w GateFlow

**Obecnie**: Tylko URL do zewnętrznych plików
**Przyszłość**: Upload plików do własnego storage

**Wymagania**:
- Supabase Storage integration
- Upload limits per plan (Free/Pro/Enterprise)
- File type validation
- CDN distribution
- Download tracking
- Bandwidth monitoring

**Storage Limits**:
- Free: 1GB, max 100MB per file
- Pro: 10GB, max 500MB per file
- Enterprise: Unlimited, custom limits

---

## 📊 Analytics & Reporting

### Video Analytics
**Status**: 📋 Planned
**Opis**: Szczegółowe statystyki odtwarzania video

**Metryki**:
- Completion rate (% obejrzenia)
- Average watch time
- Most watched videos
- Drop-off points
- Engagement score

---

## 🛠️ Technical Improvements

### Content Delivery Type Refactoring
**Status**: 💭 Idea
**Opis**: Rozszerzenie systemu `content_delivery_type`

**Obecne typy**:
- `content` - chroniona treść na stronie
- `redirect` - przekierowanie po zakupie

**Nowe typy do dodania**:
- `bunny_video` - Bunny.net video embed 🟢
- `download` - Direct file download
- `video_course` - Seria filmów (kurs)
- `membership` - Dostęp do membership area
- `api_access` - API credentials delivery

---

## 🎓 Courses & Learning

### Video Course Structure
**Status**: 💭 Idea
**Opis**: Wsparcie dla kursów składających się z wielu lekcji

**Funkcje**:
- Chapters & Lessons hierarchy
- Progress tracking
- Sequential unlocking (lesson 2 po ukończeniu lesson 1)
- Certificates po ukończeniu
- Quiz integration

---

## 🔐 Security & Access Control

### Secure Video Streaming
**Status**: 🏗️ In Progress (part of Bunny.net integration)
**Opis**: Zabezpieczone streamowanie video przed nieautoryzowanym dostępem

**Rozwiązanie**: Bunny.net z signed URLs i token authentication

---

## 📝 Notation

**Status Tags**:
- 🟢 High Priority
- 🟡 Medium Priority
- 🔵 Low Priority

**Progress**:
- 💭 Idea - pomysł do przemyślenia
- 📋 Planned - zaplanowane do implementacji
- 🏗️ In Progress - w trakcie implementacji
- ✅ Done - zrobione
- ❌ Cancelled - anulowane/porzucone

---

## 🎯 Current Sprint

### Sprint 1: Bunny.net Basic Integration ✅ COMPLETED
- [x] ~~Dodać typ `bunny_video` do content_delivery_type~~ (Używamy istniejącego `video_embed`)
- [x] UI w admin panelu do konfiguracji Bunny video
- [x] Embed iframe w produktach
- [x] Testowanie z różnymi formatami Bunny.net URLs
- [x] Parser dla wielu platform (YouTube, Vimeo, Bunny, etc.)
- [x] Platform badges
- [x] Helpful hints

### Sprint 2: Next Steps
- [ ] Pełna integracja z Bunny.net API (upload z admin panelu)
- [ ] Zaawansowana stylizacja video playera (PrestoPlayer-style)
- [ ] Video analytics tracking

---

**Last Updated**: 2025-11-27
**Version**: 1.1
