# GateFlow - Product Backlog

A list of ideas and planned features for the platform's development.

## 🎥 Video & Media

### 🟢 High Priority

#### Bunny.net Video Embed Integration
**Status**: ✅ Done (2025-11-27)
**Description**: Basic integration - ability to embed video from Bunny.net via iframe.
**Implemented**:
- ✅ Smart video URL parser (`videoUtils.ts`)
- ✅ Automatic conversion of YouTube watch URLs → embed URLs
- ✅ Support for Bunny.net (iframe.mediadelivery.net)
- ✅ Support for Vimeo, Loom, Wistia, DailyMotion, Twitch
- ✅ Platform badges on the video player
- ✅ Security - only trusted platforms
- ✅ Better error messages displaying the incorrect URL
- ✅ Helpful hints in the product form

**Solved Issues**:
- ✅ YouTube embeds (`www.youtube.com refused to connect`) - now automatically converted to embed URL
- ✅ Support for various YouTube URL formats (watch, youtu.be, embed, mobile)
- ✅ Bunny.net works out-of-the-box

---

### 🟡 Medium Priority

#### Full Integration with Bunny.net API
**Status**: 📋 Planned
**Description**: Upload videos directly from the GateFlow admin panel to Bunny.net.
**Requirements**:
- Configuration of Bunny.net API key in the admin panel
- Upload interface in the admin panel
- Progress bar during upload
- Automatic embed code generation
- Video library management (list, edit, delete)

**Technical**:
- New section in Settings: "Video Hosting"
- Integration with Bunny.net Stream API
- Database field: `bunny_api_key` (encrypted)
- Video library management UI

**API Endpoints Needed**:
- `POST /api/admin/video/upload` - upload to Bunny.net
- `GET /api/admin/video/list` - list videos
- `DELETE /api/admin/video/:id` - delete a video

---

#### Advanced Video Player Styling (inspired by Presto Player)
**Status**: 📋 Planned
**Description**: Customization of the video player's appearance and features.

**Features**:
- 🎨 **Custom Styling**:
  - Player UI color selection
  - Custom play/pause buttons
  - Logo overlay on video
  - Custom progress bar

- ⚙️ **Player Controls**:
  - Enable/disable controls
  - Auto-play configuration
  - Muted Autoplay Preview
  - Playback speed control
  - Picture-in-Picture
  - Fullscreen options
  - Sticky player (player stays visible on scroll)

- 🎯 **Overlays & CTAs (Layers)**:
  - Text overlays at specific timestamps
  - CTA buttons (e.g., "Buy Now" at 5:00)
  - Email capture overlay (lead generation)
  - Custom thumbnail before playback
  - Action Bars with multiple buttons

- 🧠 **Smart Features**:
  - **Remember last playback position (per user/per video)**
  - Video Chapters support

- 📊 **Analytics**:
  - Video watch percentage tracking
  - Heat maps (which moments are re-watched/skipped)
  - Drop-off points
  - Engagement metrics

**UI in Admin Panel**:
- Visual player customizer
- Timeline editor for overlays
- Preview before saving

**Inspiration**: https://prestoplayer.com/

---

### 🔵 Low Priority

#### In-App File Hosting
**Status**: 💭 Idea
**Description**: Ability to upload and host files directly within GateFlow.

**Currently**: Only URLs to external files.
**Future**: Upload files to own storage.

**Requirements**:
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

## 🛒 Checkout & Payments

### 🟡 Medium Priority

#### Configurable Stripe Checkout Experience
**Status**: 📋 Planned
**Description**: Allow administrators to choose and configure how users pay for products, aiming for greater flexibility and adaptation to various sales scenarios.

**Required Implementation Options**:
1.  **Redirect Checkout**:
    - Classic, Stripe-hosted payment process.
    - Simplest integration, highest level of security and PCI compliance.
    - User is redirected to `checkout.stripe.com`.

2.  **Embedded Checkout (Current Method)**:
    - A complete payment form embedded directly on the product page (`/p/[slug]`).
    - Uses Stripe's `CheckoutProvider` and `<PaymentElement>`.
    - Provides a seamless experience without leaving the site.
    - Currently implemented in `admin-panel/src/app/[locale]/checkout/[slug]/page.tsx`.

3.  **Custom Checkout (Stripe Elements)**:
    - Build a fully custom payment form using individual `Stripe Elements` components (`CardNumberElement`, `CardExpiryElement`, `CardCvcElement`, etc.).
    - Allows for full control over the look and layout of each form field.
    - Requires using the `Elements` provider instead of `CheckoutProvider`.
    - Enables styling each element separately, similar to `easycart.pl`.

**Implementation Proposal**:
- In the admin panel, when creating/editing a product, add an option to select the checkout type: "Redirect", "Embedded", "Custom".
- Based on this setting, the product page (`/p/[slug]`) will render the appropriate payment component.
- This requires creating a new component for the "Custom Checkout" option and logic to switch between the three modes.

**Inspiration**:
- Stripe Docs: [React Stripe.js](https://docs.stripe.com/sdks/stripejs-react)
- Example: `easycart.pl`

---

## 📊 Analytics & Reporting

### Video Analytics
**Status**: 📋 Planned
**Description**: Detailed video playback statistics.

**Metrics**:
- Completion rate (%)
- Average watch time
- Most watched videos
- Drop-off points
- Engagement score

---

## 🛠️ Technical Improvements

### Content Delivery Type Refactoring
**Status**: 💭 Idea
**Description**: Extend the `content_delivery_type` system.

**Current Types**:
- `content` - protected content on the page
- `redirect` - redirect after purchase

**New Types to Add**:
- `bunny_video` - Bunny.net video embed 🟢
- `download` - Direct file download
- `video_course` - A series of videos (course)
- `membership` - Access to a membership area
- `api_access` - API credentials delivery

---

## 🎓 Courses & Learning

### Video Course Structure
**Status**: 💭 Idea
**Description**: Support for courses composed of multiple lessons.

**Features**:
- Chapters & Lessons hierarchy
- Progress tracking
- Sequential unlocking (lesson 2 after completing lesson 1)
- Certificates upon completion
- Quiz integration

---

## 🔐 Security & Access Control

### 🟡 Medium Priority

#### Configurable URL Validation
**Status**: 📋 Planned
**Description**: Add a global setting in the admin panel to enable or disable strict URL validation for content links, such as `video_embed` or `download_link` fields.

**Requirements**:
- A toggle switch in the admin settings area (e.g., under "Security" or "General").
- The setting should be **enabled by default** to ensure maximum security.
- When disabled, the system should skip the whitelist/format validation for URLs, allowing administrators to use any URL format (e.g., for local development, testing, or unsupported providers).
- A clear warning message should be displayed next to the setting, explaining the security risks of disabling validation (e.g., potential for embedding malicious content).

**Use Case**:
- Allows developers to test with `localhost` URLs.
- Enables the use of video providers not yet officially supported by the internal parser.
- Provides a quick workaround if a valid URL from a supported provider is incorrectly flagged as invalid.

---

### Secure Video Streaming
**Status**: 🏗️ In Progress (part of Bunny.net integration)
**Description**: Secure video streaming against unauthorized access.

**Solution**: Bunny.net with signed URLs and token authentication.

---

## 📝 Notation

**Status Tags**:
- 🟢 High Priority
- 🟡 Medium Priority
- 🔵 Low Priority

**Progress**:
- 💭 Idea - to be considered
- 📋 Planned - scheduled for implementation
- 🏗️ In Progress - currently being implemented
- ✅ Done - completed
- ❌ Cancelled - cancelled/abandoned

---

## 🎯 Current Sprint

### Sprint 1: Bunny.net Basic Integration ✅ COMPLETED
- [x] ~~Add `bunny_video` type to content_delivery_type~~ (Using existing `video_embed`)
- [x] UI in admin panel for Bunny video configuration
- [x] Embed iframe in products
- [x] Testing with various Bunny.net URL formats
- [x] Parser for multiple platforms (YouTube, Vimeo, Bunny, etc.)
- [x] Platform badges
- [x] Helpful hints

### Sprint 2: Next Steps
- [ ] Full integration with Bunny.net API (upload from admin panel)
- [ ] Advanced video player styling (PrestoPlayer-style)
- [ ] Video analytics tracking

---

**Last Updated**: 2025-11-27
**Version**: 1.2
