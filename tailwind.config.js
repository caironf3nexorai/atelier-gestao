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
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899', // Pink
                    600: '#db2777',
                    700: '#be185d',
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
