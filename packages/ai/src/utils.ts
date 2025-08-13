export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
  return text.match(hashtagRegex) || [];
}

export function removeHashtags(text: string): string {
  const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
  return text.replace(hashtagRegex, '').trim();
}

export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n')  // Multiple newlines to single newline
    .trim();
}

export function formatForPlatform(
  text: string,
  platform: string,
  options?: {
    maxLength?: number;
    preserveLineBreaks?: boolean;
    addEmojis?: boolean;
  }
): string {
  let formatted = text;
  
  // Platform-specific formatting
  switch (platform) {
    case 'threads':
    case 'twitter':
      // Shorter paragraphs for better mobile reading
      formatted = formatted.replace(/\n{2,}/g, '\n\n');
      break;
      
    case 'youtube':
      // Add line breaks for better video description formatting
      formatted = formatted.replace(/([.。!！?？])\s/g, '$1\n\n');
      break;
      
    case 'wordpress':
      // Maintain paragraph structure
      break;
  }
  
  if (options?.maxLength) {
    formatted = truncateText(formatted, options.maxLength);
  }
  
  if (!options?.preserveLineBreaks) {
    formatted = cleanText(formatted);
  }
  
  return formatted;
}

export function generateTags(
  topics: string[],
  maxTags: number,
  platform?: string
): string[] {
  let tags = [...topics];
  
  // Platform-specific tag formatting
  if (platform === 'instagram') {
    // Instagram allows more tags
    tags = tags.slice(0, Math.min(maxTags, 30));
  } else if (platform === 'twitter') {
    // Twitter needs shorter tags
    tags = tags.slice(0, Math.min(maxTags, 3));
  } else {
    tags = tags.slice(0, maxTags);
  }
  
  // Ensure tags are properly formatted (no spaces, Japanese support)
  return tags.map(tag => 
    tag.replace(/\s+/g, '').replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
  ).filter(tag => tag.length > 0);
}

export function validateContent(
  text: string,
  constraints: {
    maxLength: number;
    maxTags?: number;
    requiredElements?: string[];
  }
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check length
  if (text.length > constraints.maxLength) {
    errors.push(`Text length (${text.length}) exceeds maximum (${constraints.maxLength})`);
  }
  
  // Check tags if specified
  if (constraints.maxTags) {
    const tags = extractHashtags(text);
    if (tags.length > constraints.maxTags) {
      errors.push(`Too many hashtags (${tags.length}), maximum is ${constraints.maxTags}`);
    }
  }
  
  // Check required elements
  if (constraints.requiredElements) {
    for (const element of constraints.requiredElements) {
      if (!text.includes(element)) {
        warnings.push(`Missing recommended element: ${element}`);
      }
    }
  }
  
  // Length warnings
  if (text.length < constraints.maxLength * 0.5) {
    warnings.push('Content might be too short for optimal engagement');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}