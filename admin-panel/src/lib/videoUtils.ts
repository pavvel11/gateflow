/**
 * Video URL Utilities
 *
 * Helper functions for parsing and converting video URLs from various platforms
 * into proper embed URLs.
 */

export interface ParsedVideoUrl {
  platform: 'youtube' | 'vimeo' | 'loom' | 'wistia' | 'dailymotion' | 'twitch' | 'bunny' | 'unknown';
  videoId: string | null;
  embedUrl: string | null;
  isValid: boolean;
}

/**
 * Extract YouTube video ID from various URL formats
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }

    // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const match = urlObj.pathname.match(/\/(embed|v)\/([^/?]+)/);
      if (match) {
        return match[2];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract Vimeo video ID from various URL formats
 *
 * Supports:
 * - https://vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 */
export function extractVimeoVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // player.vimeo.com/video/VIDEO_ID
    if (urlObj.hostname === 'player.vimeo.com') {
      const match = urlObj.pathname.match(/\/video\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    // vimeo.com/VIDEO_ID
    if (urlObj.hostname === 'vimeo.com') {
      const match = urlObj.pathname.match(/\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract Bunny.net video ID and library ID
 *
 * Supports:
 * - https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_GUID
 * - https://iframe.mediadelivery.net/play/LIBRARY_ID/VIDEO_GUID
 */
export function extractBunnyVideoId(url: string): { libraryId: string; videoGuid: string } | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === 'iframe.mediadelivery.net') {
      const match = urlObj.pathname.match(/\/(embed|play)\/([^/]+)\/([^/?]+)/);
      if (match) {
        return {
          libraryId: match[2],
          videoGuid: match[3]
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse any video URL and return structured information
 */
export function parseVideoUrl(url: string): ParsedVideoUrl {
  if (!url) {
    return {
      platform: 'unknown',
      videoId: null,
      embedUrl: null,
      isValid: false
    };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // YouTube
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return {
          platform: 'youtube',
          videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          isValid: true
        };
      }
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      const videoId = extractVimeoVideoId(url);
      if (videoId) {
        return {
          platform: 'vimeo',
          videoId,
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          isValid: true
        };
      }
    }

    // Bunny.net
    if (hostname === 'iframe.mediadelivery.net') {
      const bunnyIds = extractBunnyVideoId(url);
      if (bunnyIds) {
        return {
          platform: 'bunny',
          videoId: `${bunnyIds.libraryId}/${bunnyIds.videoGuid}`,
          embedUrl: `https://iframe.mediadelivery.net/embed/${bunnyIds.libraryId}/${bunnyIds.videoGuid}`,
          isValid: true
        };
      }
    }

    // Loom
    if (hostname.includes('loom.com')) {
      const match = urlObj.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
      if (match) {
        const videoId = match[1];
        return {
          platform: 'loom',
          videoId,
          embedUrl: `https://www.loom.com/embed/${videoId}`,
          isValid: true
        };
      }
    }

    // Wistia
    if (hostname.includes('wistia.com') || hostname.includes('wistia.net')) {
      // Wistia URLs are complex, for now just validate
      if (urlObj.pathname.includes('/embed/')) {
        return {
          platform: 'wistia',
          videoId: null,
          embedUrl: url, // Already embed URL
          isValid: true
        };
      }
    }

    // DailyMotion
    if (hostname.includes('dailymotion.com')) {
      const match = urlObj.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
      if (match) {
        const videoId = match[1];
        return {
          platform: 'dailymotion',
          videoId,
          embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
          isValid: true
        };
      }
    }

    // Twitch
    if (hostname.includes('twitch.tv')) {
      const match = urlObj.pathname.match(/\/videos\/(\d+)/);
      if (match) {
        const videoId = match[1];
        return {
          platform: 'twitch',
          videoId,
          embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`,
          isValid: true
        };
      }
    }

    // If URL starts with allowed domains but we couldn't parse it,
    // assume it's already a valid embed URL
    const allowedEmbedDomains = [
      'youtube.com/embed',
      'player.vimeo.com',
      'iframe.mediadelivery.net',
      'loom.com/embed',
      'fast.wistia.com',
      'dailymotion.com/embed',
      'player.twitch.tv'
    ];

    if (allowedEmbedDomains.some(domain => url.includes(domain))) {
      return {
        platform: 'unknown',
        videoId: null,
        embedUrl: url,
        isValid: true
      };
    }

  } catch (error) {
    // Invalid URL
  }

  return {
    platform: 'unknown',
    videoId: null,
    embedUrl: null,
    isValid: false
  };
}

/**
 * Check if a URL is from a trusted video platform
 */
export function isTrustedVideoPlatform(url: string): boolean {
  if (!url) return false;

  const trustedDomains = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'iframe.mediadelivery.net', // Bunny.net
    'loom.com',
    'wistia.com',
    'wistia.net',
    'dailymotion.com',
    'twitch.tv',
    'streamable.com'
  ];

  try {
    const urlObj = new URL(url);
    return trustedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Get embed URL from any video URL
 * Returns null if URL is invalid or not from a trusted platform
 */
export function getEmbedUrl(url: string): string | null {
  const parsed = parseVideoUrl(url);
  return parsed.isValid ? parsed.embedUrl : null;
}
