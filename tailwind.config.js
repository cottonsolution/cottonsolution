/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0e3b2e",     // deep trucking-green (headers, footer, headings)
          navyLight: "#155743",
          green: "#146c43",    // supporting mid green accent
          orange: "#f2711f",   // CTA / accent — matches reference design
          orangeDark: "#c2540f",
          orangeSoft: "#fff1e6",
          slate: "#eef2f0",    // light background
          gold: "#d4a527",     // emblem / badge accents
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(14, 59, 46, 0.08)",
        pop: "0 8px 30px rgba(14, 59, 46, 0.14)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
