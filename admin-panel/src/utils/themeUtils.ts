// List of emoji icons for products
export const PRODUCT_ICONS: Record<string, string> = {
  'rocket': '🚀',
  'gem': '💎',
  'hammer': '🛠️',
  'building': '🏢',
  'zap': '⚡',
  'books': '📚',
  'bulb': '💡',
  'chart': '📊',
  'star': '⭐',
  'money': '💰',
  'lock': '🔒',
  'globe': '🌎',
  'check': '✅',
  'laptop': '💻',
  'phone': '📱',
  'camera': '📸',
};

// Get the emoji for an icon id
export function getIconEmoji(iconId?: string): string {
  return PRODUCT_ICONS[iconId || 'rocket'] || PRODUCT_ICONS.rocket;
}
