/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fffffa',
                    100: '#feffdb',
                    200: '#feffba',
                    300: '#fdfe98', // The base color requested (Using as 300/400 base)
                    400: '#fdfe98',
                    500: '#fcfd50', // Slightly darker for visibility as "Main"
                    600: '#e3e530', // Hover state
                    700: '#c5c710',
                },
                secondary: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    500: '#8b5cf6', // Violet
                    700: '#6d28d9',
                }
            }
        },
    },
    plugins: [],
}
