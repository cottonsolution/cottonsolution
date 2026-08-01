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
          navy: "#0f172a",   // deep corporate green-navy (primary dark)
          green: "#14532d",  // supporting deep green accent
          orange: "#f97316", // CTA / accent
          orangeDark: "#c2410c",
          slate: "#f8fafc",  // light background
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
