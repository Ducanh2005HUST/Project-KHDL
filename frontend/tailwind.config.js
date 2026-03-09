/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef5ff',
                    100: '#d9e8ff',
                    200: '#bcd7ff',
                    300: '#8ebfff',
                    400: '#599cff',
                    500: '#3378ff',
                    600: '#1b57f5',
                    700: '#1443e1',
                    800: '#1736b6',
                    900: '#19328f',
                    950: '#142057',
                },
                surface: {
                    50: '#f8f9fc',
                    100: '#f0f2f7',
                    200: '#e4e7ef',
                    300: '#ced4e2',
                    400: '#b3bbd0',
                    500: '#9ba4bc',
                    600: '#8089a5',
                    700: '#6b7390',
                    800: '#596076',
                    900: '#4b5162',
                    950: '#2c303a',
                },
                dark: {
                    700: '#1e2130',
                    800: '#171a27',
                    900: '#10121c',
                    950: '#0a0c14',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
