/**
 * Video Utilities Unit Tests
 *
 * Tests for video URL parsing and embed URL generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractYouTubeVideoId,
  extractVimeoVideoId,
  extractBunnyVideoId,
  parseVideoUrl,
  isTrustedVideoPlatform,
  addEmbedOptions,
  getEmbedUrl,
} from '@/lib/videoUtils';

describe('Video Utilities', () => {
  describe('extractYouTubeVideoId', () => {
    it('should extract ID from watch URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from short URL', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from embed URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from v/ URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should handle mobile URLs', () => {
      expect(extractYouTubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should handle URLs with additional parameters', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
    });

    it('should handle short URL with query params', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URLs', () => {
      expect(extractYouTubeVideoId('not-a-url')).toBe(null);
      expect(extractYouTubeVideoId('https://youtube.com/channel/abc')).toBe(null);
      expect(extractYouTubeVideoId('')).toBe(null);
    });
  });

  describe('extractVimeoVideoId', () => {
    it('should extract ID from standard URL', () => {
      expect(extractVimeoVideoId('https://vimeo.com/123456789')).toBe('123456789');
    });

    it('should extract ID from player URL', () => {
      expect(extractVimeoVideoId('https://player.vimeo.com/video/123456789')).toBe('123456789');
    });

    it('should return null for channel URLs', () => {
      expect(extractVimeoVideoId('https://vimeo.com/channels/staffpicks')).toBe(null);
    });

    it('should return null for invalid URLs', () => {
      expect(extractVimeoVideoId('not-a-url')).toBe(null);
      expect(extractVimeoVideoId('')).toBe(null);
    });
  });

  describe('extractBunnyVideoId', () => {
    it('should extract IDs from embed URL', () => {
      const result = extractBunnyVideoId('https://iframe.mediadelivery.net/embed/12345/abc-def-ghi');
      expect(result).toEqual({ libraryId: '12345', videoGuid: 'abc-def-ghi' });
    });

    it('should extract IDs from play URL', () => {
      const result = extractBunnyVideoId('https://iframe.mediadelivery.net/play/12345/abc-def-ghi');
      expect(result).toEqual({ libraryId: '12345', videoGuid: 'abc-def-ghi' });
    });

    it('should return null for non-bunny URLs', () => {
      expect(extractBunnyVideoId('https://youtube.com/watch?v=abc')).toBe(null);
    });

    it('should return null for invalid URLs', () => {
      expect(extractBunnyVideoId('not-a-url')).toBe(null);
      expect(extractBunnyVideoId('')).toBe(null);
    });
  });

  describe('parseVideoUrl', () => {
    it('should parse YouTube URLs', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.isValid).toBe(true);
    });

    it('should parse Vimeo URLs', () => {
      const result = parseVideoUrl('https://vimeo.com/123456789');
      expect(result.platform).toBe('vimeo');
      expect(result.videoId).toBe('123456789');
      expect(result.embedUrl).toBe('https://player.vimeo.com/video/123456789');
      expect(result.isValid).toBe(true);
    });

    it('should parse Bunny.net URLs', () => {
      const result = parseVideoUrl('https://iframe.mediadelivery.net/embed/12345/abc-def');
      expect(result.platform).toBe('bunny');
      expect(result.videoId).toBe('12345/abc-def');
      expect(result.embedUrl).toBe('https://iframe.mediadelivery.net/embed/12345/abc-def');
      expect(result.isValid).toBe(true);
    });

    it('should parse Loom URLs', () => {
      const result = parseVideoUrl('https://www.loom.com/share/abc123xyz');
      expect(result.platform).toBe('loom');
      expect(result.videoId).toBe('abc123xyz');
      expect(result.embedUrl).toBe('https://www.loom.com/embed/abc123xyz');
      expect(result.isValid).toBe(true);
    });

    it('should parse Wistia media URLs', () => {
      const result = parseVideoUrl('https://company.wistia.com/medias/abc123');
      expect(result.platform).toBe('wistia');
      expect(result.videoId).toBe('abc123');
      expect(result.embedUrl).toBe('https://fast.wistia.net/embed/iframe/abc123');
      expect(result.isValid).toBe(true);
    });

    it('should parse DailyMotion URLs', () => {
      const result = parseVideoUrl('https://www.dailymotion.com/video/x8abc123');
      expect(result.platform).toBe('dailymotion');
      expect(result.videoId).toBe('x8abc123');
      expect(result.embedUrl).toBe('https://www.dailymotion.com/embed/video/x8abc123');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty URL', () => {
      const result = parseVideoUrl('');
      expect(result.isValid).toBe(false);
      expect(result.platform).toBe('unknown');
    });

    it('should return invalid for malformed URL', () => {
      const result = parseVideoUrl('not-a-url');
      expect(result.isValid).toBe(false);
    });

    it('should accept already-embed URLs from known platforms', () => {
      const result = parseVideoUrl('https://player.vimeo.com/video/123456');
      expect(result.isValid).toBe(true);
    });
  });

  describe('isTrustedVideoPlatform', () => {
    it('should return true for YouTube', () => {
      expect(isTrustedVideoPlatform('https://www.youtube.com/watch?v=abc')).toBe(true);
      expect(isTrustedVideoPlatform('https://youtu.be/abc')).toBe(true);
    });

    it('should return true for Vimeo', () => {
      expect(isTrustedVideoPlatform('https://vimeo.com/123')).toBe(true);
    });

    it('should return true for Bunny.net', () => {
      expect(isTrustedVideoPlatform('https://iframe.mediadelivery.net/embed/123/abc')).toBe(true);
    });

    it('should return true for Loom', () => {
      expect(isTrustedVideoPlatform('https://www.loom.com/share/abc')).toBe(true);
    });

    it('should return true for Wistia', () => {
      expect(isTrustedVideoPlatform('https://company.wistia.com/medias/abc')).toBe(true);
      expect(isTrustedVideoPlatform('https://fast.wistia.net/embed/iframe/abc')).toBe(true);
    });

    it('should return false for untrusted domains', () => {
      expect(isTrustedVideoPlatform('https://malicious-site.com/video')).toBe(false);
      expect(isTrustedVideoPlatform('https://fake-video.net/watch?v=abc')).toBe(false);
    });

    it('should return false for empty/invalid URLs', () => {
      expect(isTrustedVideoPlatform('')).toBe(false);
      expect(isTrustedVideoPlatform('not-a-url')).toBe(false);
    });
  });

  describe('addEmbedOptions', () => {
    it('should add YouTube options', () => {
      const url = addEmbedOptions('https://www.youtube.com/embed/abc', { autoplay: true, muted: true });
      expect(url).toContain('autoplay=1');
      expect(url).toContain('mute=1');
    });

    it('should add Vimeo options', () => {
      const url = addEmbedOptions('https://player.vimeo.com/video/123', { autoplay: true, loop: true });
      expect(url).toContain('autoplay=1');
      expect(url).toContain('loop=1');
    });

    it('should add Bunny options', () => {
      const url = addEmbedOptions('https://iframe.mediadelivery.net/embed/123/abc', {
        autoplay: true,
        muted: true,
        preload: true
      });
      expect(url).toContain('autoplay=true');
      expect(url).toContain('muted=true');
      expect(url).toContain('preload=true');
      expect(url).toContain('responsive=true');
    });

    it('should add Wistia options', () => {
      const url = addEmbedOptions('https://fast.wistia.net/embed/iframe/abc', { autoplay: true, muted: true });
      expect(url).toContain('autoPlay=true');
      expect(url).toContain('muted=true');
    });

    it('should return original URL for empty input', () => {
      expect(addEmbedOptions('', {})).toBe('');
    });

    it('should return original URL for invalid URL', () => {
      expect(addEmbedOptions('not-a-url', { autoplay: true })).toBe('not-a-url');
    });

    it('should handle controls=false', () => {
      const ytUrl = addEmbedOptions('https://www.youtube.com/embed/abc', { controls: false });
      expect(ytUrl).toContain('controls=0');

      const vimeoUrl = addEmbedOptions('https://player.vimeo.com/video/123', { controls: false });
      expect(vimeoUrl).toContain('controls=0');
    });
  });

  describe('getEmbedUrl', () => {
    it('should return embed URL for valid video', () => {
      const result = getEmbedUrl('https://www.youtube.com/watch?v=abc123');
      expect(result).toBe('https://www.youtube.com/embed/abc123');
    });

    it('should apply options when provided', () => {
      const result = getEmbedUrl('https://www.youtube.com/watch?v=abc123', { autoplay: true });
      expect(result).toContain('autoplay=1');
    });

    it('should return null for invalid URL', () => {
      expect(getEmbedUrl('not-a-url')).toBe(null);
      expect(getEmbedUrl('')).toBe(null);
    });

    it('should return null for non-video platforms', () => {
      expect(getEmbedUrl('https://unknown-platform.com/video/123')).toBe(null);
    });
  });
});
