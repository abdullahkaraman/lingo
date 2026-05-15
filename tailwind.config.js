/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        flip: {
          '0%': { transform: 'rotateX(0deg)' },
          '50%': { transform: 'rotateX(-90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-6px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(6px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flashRed: {
          '0%':   { backgroundColor: 'rgba(220,38,38,0.15)', borderColor: 'rgb(239,68,68)' },
          '30%':  { backgroundColor: 'rgba(220,38,38,0.65)', borderColor: 'rgb(239,68,68)' },
          '60%':  { backgroundColor: 'rgba(220,38,38,0.65)', borderColor: 'rgb(239,68,68)' },
          '100%': { backgroundColor: 'rgba(220,38,38,0.15)', borderColor: 'rgb(239,68,68)' },
        },
        timerPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        flip: 'flip 0.5s ease-in-out forwards',
        shake: 'shake 0.5s ease-in-out',
        bounceIn: 'bounceIn 0.4s ease-out forwards',
        pop: 'pop 0.15s ease-in-out',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        flashRed: 'flashRed 0.7s ease-in-out forwards',
        timerPulse: 'timerPulse 0.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
