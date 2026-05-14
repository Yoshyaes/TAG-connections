/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  // Scope all utilities to the SPA mount point. The SPA loads on the WP
  // /connections/ page after the theme's own Tailwind build; without
  // scoping, this bundle's later-declared `.hidden { display: none }`
  // overrides the theme's `md:flex` and the desktop nav disappears.
  // Universal-prefixing here keeps the SPA's styling self-contained.
  important: '#tag-connections-root',
  corePlugins: {
    // Preflight emits rules like `h1..h6 { font-size: inherit }` and
    // `a { color: inherit }` with universal selectors that bleed onto
    // the surrounding WP page. Disable it; the SPA brings its own
    // resets in index.css scoped to #tag-connections-root.
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      maxWidth: {
        game: '480px',
      },
      borderRadius: {
        tile: '10px',
      },
    },
  },
  plugins: [],
};
