/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#6366F1', // Electric Iris
          glow: '#818CF8',
          deep: '#4F46E5',
          spark: '#FBBF24',   // Amber Gold Spark
          flame: '#F59E0B',
          tint: '#1E1B4B',
        },
        surface: {
          void: '#090D16',      // Pure Deep Obsidian
          card: '#131B2E',      // Dark Slate Card
          elevated: '#1E293B',  // Elevated Popover / Modal
          border: '#334155',    // Border Highlight
          subtle: '#0F172A',    // Subdued Container
        },
        srs: {
          mastered: '#10B981', // Emerald (Grade 5)
          good: '#14B8A6',     // Teal (Grade 4)
          pass: '#F59E0B',     // Amber (Grade 3)
          hard: '#F97316',     // Orange (Grade 2)
          blackout: '#F43F5E', // Rose (Grade 0-1)
        },
      },
    },
  },
  plugins: [],
};
