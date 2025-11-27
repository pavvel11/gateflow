# Video Embed Guide

Quick guide on how to use video embeds in GateFlow products.

## 🎬 Supported Platforms

GateFlow automatically recognizes and converts URLs from these platforms:

- 📺 **YouTube** - All URL formats
- 🎬 **Vimeo** - Watch and player URLs
- 🐰 **Bunny.net** - Secure CDN streaming
- 🎥 **Loom** - Screen recordings
- 📹 **Wistia** - Business videos
- 🎞️ **DailyMotion** - Video sharing
- 🎮 **Twitch** - Gaming and livestreams

## 🚀 How to Add Video to Product

1. **Go to Admin Panel** → Products
2. **Create/Edit Product**
3. **Content Delivery Type** → Select "Content Items"
4. **Add Content Item** → Select "Video Embed"
5. **Paste ANY video URL** - we'll convert it automatically!

## 📺 YouTube URL Formats

All these formats work automatically:

```
✅ https://www.youtube.com/watch?v=Srde_dNfZsA
✅ https://youtu.be/Srde_dNfZsA
✅ https://www.youtube.com/embed/Srde_dNfZsA
✅ https://m.youtube.com/watch?v=Srde_dNfZsA
✅ https://www.youtube.com/v/Srde_dNfZsA
```

**All convert to**: `https://www.youtube.com/embed/Srde_dNfZsA`

## 🐰 Bunny.net CDN

### What is Bunny.net?

Bunny.net is a secure video CDN that provides:
- 🔐 Secure streaming with DRM
- 🚀 Fast global CDN
- 📊 Video analytics
- 🎯 Geo-blocking capabilities
- 💰 Cost-effective pricing

### How to Use Bunny.net

1. **Upload video to Bunny.net** (via their dashboard)
2. **Get embed URL** from Bunny.net:
   - Format: `https://iframe.mediadelivery.net/embed/{libraryId}/{videoGuid}`
3. **Paste it in GateFlow** - done! ✅

### Example Bunny.net URL

```
https://iframe.mediadelivery.net/embed/123456/a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

Components:
- `123456` - Your Library ID
- `a1b2c3d4-...` - Video GUID

## 🎬 Vimeo URLs

Supported formats:

```
✅ https://vimeo.com/123456789
✅ https://player.vimeo.com/video/123456789
```

**Converts to**: `https://player.vimeo.com/video/123456789`

## 🎥 Other Platforms

### Loom
```
✅ https://www.loom.com/share/abc123def456
→ https://www.loom.com/embed/abc123def456
```

### Wistia
```
✅ https://fast.wistia.com/embed/iframe/abc123
(Already in embed format - used as-is)
```

### DailyMotion
```
✅ https://www.dailymotion.com/video/x123abc
→ https://www.dailymotion.com/embed/video/x123abc
```

### Twitch
```
✅ https://www.twitch.tv/videos/123456789
→ https://player.twitch.tv/?video=123456789&parent={your-domain}
```

## ✨ Features

### Automatic Platform Detection

When you paste a URL, GateFlow:
1. 🔍 Detects the platform
2. 🎯 Extracts video ID
3. 🔄 Converts to proper embed URL
4. ✅ Validates security
5. 🏷️ Shows platform badge

### Platform Badges

Videos show a small badge indicating the platform:

- 📺 YouTube
- 🎬 Vimeo
- 🐰 Bunny.net
- 🎥 Loom
- 📹 Wistia
- 🎞️ DailyMotion
- 🎮 Twitch

### Error Messages

If URL is invalid, you'll see:
- ⚠️ Clear error message
- 📝 Helpful hint
- 🔗 The problematic URL displayed

## 🔐 Security

**Trusted Platforms Only**: Only URLs from trusted platforms are allowed.

**Automatic Validation**:
- ✅ URL must be from trusted domain
- ✅ Must be HTTPS
- ✅ Proper format for each platform

**Sandbox Protection**: Videos are embedded with secure sandbox attributes.

## 📖 Examples

### Example 1: YouTube Course Video

```
Title: "Introduction to React"
URL: https://www.youtube.com/watch?v=abc123
Result: ✅ Embedded as YouTube video with "📺 YouTube" badge
```

### Example 2: Bunny.net Premium Content

```
Title: "Premium Training Module 1"
URL: https://iframe.mediadelivery.net/embed/123456/video-guid-here
Result: ✅ Embedded as Bunny.net video with "🐰 Bunny.net" badge
```

### Example 3: Vimeo Portfolio

```
Title: "Portfolio Showcase"
URL: https://vimeo.com/123456789
Result: ✅ Embedded as Vimeo video with "🎬 Vimeo" badge
```

## 🚨 Common Issues

### "www.youtube.com refused to connect"

**Problem**: Pasting YouTube watch URL directly
**Solution**: ✅ **FIXED!** We now automatically convert watch URLs to embed URLs

### Invalid Video URL

**Causes**:
- URL from unsupported platform
- Malformed URL
- Missing video ID

**Solution**:
- Check if platform is supported (see list above)
- Verify URL is complete and correct
- Try copying URL again from platform

### Video Not Playing

**Causes**:
- Video is private/unlisted
- Geographic restrictions
- Video has been deleted

**Solution**:
- Ensure video is public
- Check video still exists on platform
- Try different video

## 💡 Tips

1. **Any YouTube Format Works**: Don't worry about converting URLs - paste any YouTube URL format!

2. **Bunny.net for Premium**: Use Bunny.net for:
   - DRM-protected content
   - Geo-restricted content
   - Analytics tracking
   - Custom player branding

3. **Multiple Videos**: You can add multiple video embeds to one product

4. **Order Matters**: Videos display in the order you add them (drag to reorder in future)

5. **Preview Before Publishing**: Use the preview link in product form to test

## 🔮 Coming Soon

### Full Bunny.net Integration
- Upload videos directly from admin panel
- Video library management
- Automatic thumbnail generation
- Bandwidth analytics

### Advanced Player Features
- Custom player styling
- Overlays and CTAs
- Progress tracking
- Speed controls
- Chapters support

### Video Analytics
- Watch completion rates
- Drop-off points
- Heat maps
- Engagement metrics

---

**Need Help?**
- Check [BACKLOG.md](BACKLOG.md) for planned features
- Report issues on GitHub
- Contact support

**Last Updated**: 2025-11-27
