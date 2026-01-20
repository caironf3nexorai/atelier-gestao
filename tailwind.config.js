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
                    50: '#fffbf0',
                    100: '#fff4d6',
                    200: '#ffe6ad',
                    300: '#ffd275',
                    400: '#ffc238',
                    500: '#fec22c', // Strong Yellow (Main)
                    600: '#e0a010', // Hover
                    700: '#b87d0a', // Active
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
