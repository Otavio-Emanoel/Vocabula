/**
 * Vocabula Design Tokens & Visual Identity System
 * "Obsidian & Electric Iris with Amber Spark"
 */

export const Colors = {
  // Brand Accents
  brand: {
    primary: '#6366F1', // Electric Iris
    glow: '#818CF8',    // Iris highlight
    deep: '#4F46E5',    // Iris dark pressed
    spark: '#FBBF24',   // Amber gold spark (streaks, stars)
    flame: '#F59E0B',   // Warm accent
    tint: '#1E1B4B',    // Iris subtle background tint
  },

  // Dark Theme (Default)
  dark: {
    void: '#090D16',       // Screen background canvas
    card: '#131B2E',       // Card background
    elevated: '#1E293B',   // Elevated modal / sheet
    subtle: '#0F172A',     // Subtle container / input
    border: '#1E293B',     // Card border
    borderHighlight: '#334155',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
  },

  // Light Theme (Editorial Paper)
  light: {
    canvas: '#F8FAFC',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    subtle: '#F1F5F9',
    border: '#E2E8F0',
    borderHighlight: '#CBD5E1',
    textPrimary: '#0F172A',
    textMuted: '#475569',
    textDim: '#94A3B8',
  },

  // Spaced Repetition (SM-2) Feedback States
  srs: {
    mastered: '#10B981', // Grade 5 (Emerald)
    good: '#14B8A6',     // Grade 4 (Teal)
    pass: '#F59E0B',     // Grade 3 (Amber)
    hard: '#F97316',     // Grade 2 (Orange)
    blackout: '#F43F5E', // Grade 0-1 (Rose)
  },
} as const;

export type ThemeColors = typeof Colors;
