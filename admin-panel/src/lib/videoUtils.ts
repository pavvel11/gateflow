/**
 * Video URL Utilities
 *
 * Helper functions for parsing and converting video URLs from various platforms
 * into proper embed URLs.
 */

/** Check if hostname matches domain exactly or is a subdomain */
function isHostnameMatch(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith('.' + domain);
}

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
    if (isHostnameMatch(urlObj.hostname, 'youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }

    // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
    if (isHostnameMatch(urlObj.hostname, 'youtube.com')) {
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
    if (isHostnameMatch(hostname, 'youtube.com') || hostname === 'youtu.be') {
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
    if (isHostnameMatch(hostname, 'vimeo.com')) {
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
    if (isHostnameMatch(hostname, 'loom.com')) {
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
    if (isHostnameMatch(hostname, 'wistia.com') || isHostnameMatch(hostname, 'wistia.net')) {
      // Check if already embed URL
      if (urlObj.pathname.includes('/embed/iframe/')) {
        const match = urlObj.pathname.match(/\/embed\/iframe\/([a-zA-Z0-9]+)/);
        if (match) {
          return {
            platform: 'wistia',
            videoId: match[1],
            embedUrl: url,
            isValid: true
          };
        }
      }

      // Standard Wistia share URL: https://companyname.wistia.com/medias/VIDEO_ID
      if (urlObj.pathname.includes('/medias/')) {
        const match = urlObj.pathname.match(/\/medias\/([a-zA-Z0-9]+)/);
        if (match) {
          const videoId = match[1];
          return {
            platform: 'wistia',
            videoId,
            embedUrl: `https://fast.wistia.net/embed/iframe/${videoId}`,
            isValid: true
          };
        }
      }

      // Legacy embed format check
      if (urlObj.pathname.includes('/embed/')) {
        return {
          platform: 'wistia',
          videoId: null,
          embedUrl: url,
          isValid: true
        };
      }
    }

    // DailyMotion
    if (isHostnameMatch(hostname, 'dailymotion.com')) {
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
    if (isHostnameMatch(hostname, 'twitch.tv')) {
      const match = urlObj.pathname.match(/\/videos\/(\d+)/);
      if (match) {
        const videoId = match[1];
        return {
          platform: 'twitch',
          videoId,
          embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`,
          isValid: true
        };
      }
    }

    // If URL matches allowed embed domains but we couldn't parse a video ID,
    // assume it's already a valid embed URL
    const allowedEmbedPatterns = [
      { domain: 'youtube.com', pathPrefix: '/embed' },
      { domain: 'player.vimeo.com', pathPrefix: '' },
      { domain: 'iframe.mediadelivery.net', pathPrefix: '' },
      { domain: 'loom.com', pathPrefix: '/embed' },
      { domain: 'fast.wistia.com', pathPrefix: '' },
      { domain: 'dailymotion.com', pathPrefix: '/embed' },
      { domain: 'player.twitch.tv', pathPrefix: '' },
    ];

    if (allowedEmbedPatterns.some(({ domain, pathPrefix }) =>
      isHostnameMatch(hostname, domain) && (!pathPrefix || urlObj.pathname.startsWith(pathPrefix))
    )) {
      return {
        platform: 'unknown',
        videoId: null,
        embedUrl: url,
        isValid: true
      };
    }

  } catch {
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
    return trustedDomains.some(domain => isHostnameMatch(urlObj.hostname, domain));
  } catch {
    return false;
  }
}

/**
 * Video embed options
 */
export interface VideoEmbedOptions {
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  preload?: boolean;
  controls?: boolean;
}

/**
 * Add query parameters to embed URL based on platform and options
 */
export function addEmbedOptions(embedUrl: string, options: VideoEmbedOptions = {}): string {
  if (!embedUrl) return embedUrl;

  try {
    const url = new URL(embedUrl);
    const hostname = url.hostname.toLowerCase();

    // Bunny.net parameters
    if (hostname === 'iframe.mediadelivery.net') {
      if (options.autoplay) url.searchParams.set('autoplay', 'true');
      if (options.loop) url.searchParams.set('loop', 'true');
      if (options.muted) url.searchParams.set('muted', 'true');
      if (options.preload) url.searchParams.set('preload', 'true');
      // Bunny always has responsive, but we can set it explicitly
      url.searchParams.set('responsive', 'true');
    }

    // YouTube parameters
    else if (isHostnameMatch(hostname, 'youtube.com')) {
      if (options.autoplay) url.searchParams.set('autoplay', '1');
      if (options.loop) url.searchParams.set('loop', '1');
      if (options.muted) url.searchParams.set('mute', '1');
      if (options.controls === false) url.searchParams.set('controls', '0');
    }

    // Vimeo parameters
    else if (isHostnameMatch(hostname, 'vimeo.com')) {
      if (options.autoplay) url.searchParams.set('autoplay', '1');
      if (options.loop) url.searchParams.set('loop', '1');
      if (options.muted) url.searchParams.set('muted', '1');
      if (options.controls === false) url.searchParams.set('controls', '0');
    }

    // Wistia parameters
    else if (isHostnameMatch(hostname, 'wistia.com') || isHostnameMatch(hostname, 'wistia.net')) {
      if (options.autoplay) url.searchParams.set('autoPlay', 'true');
      if (options.muted) url.searchParams.set('muted', 'true');
      if (options.controls === false) url.searchParams.set('controlsVisibleOnLoad', 'false');
    }

    // DailyMotion parameters
    else if (isHostnameMatch(hostname, 'dailymotion.com')) {
      if (options.autoplay) url.searchParams.set('autoplay', '1');
      if (options.muted) url.searchParams.set('mute', '1');
      if (options.controls === false) url.searchParams.set('controls', 'false');
    }

    return url.toString();
  } catch {
    return embedUrl;
  }
}

/**
 * Get embed URL from any video URL
 * Returns null if URL is invalid or not from a trusted platform
 */
export function getEmbedUrl(url: string, options?: VideoEmbedOptions): string | null {
  const parsed = parseVideoUrl(url);
  if (!parsed.isValid || !parsed.embedUrl) return null;

  return options ? addEmbedOptions(parsed.embedUrl, options) : parsed.embedUrl;
}
