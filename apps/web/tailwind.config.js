/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        'xs': '475px',  // Custom extra small breakpoint for mobile-first responsive design
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Semantic status colors for consistent feedback across themes
        status: {
          success: {
            DEFAULT: "hsl(var(--status-success))",
            foreground: "hsl(var(--status-success-foreground))",
            background: "hsl(var(--status-success-background))",
          },
          warning: {
            DEFAULT: "hsl(var(--status-warning))",
            foreground: "hsl(var(--status-warning-foreground))",
            background: "hsl(var(--status-warning-background))",
          },
          error: {
            DEFAULT: "hsl(var(--status-error))",
            foreground: "hsl(var(--status-error-foreground))",
            background: "hsl(var(--status-error-background))",
          },
          info: {
            DEFAULT: "hsl(var(--status-info))",
            foreground: "hsl(var(--status-info-foreground))",
            background: "hsl(var(--status-info-background))",
          },
        },
        // Plantation theme accent colors
        plantation: {
          green: "hsl(var(--plantation-green))",
          "green-light": "hsl(var(--plantation-green-light))",
          text: "hsl(var(--plantation-text))",
          muted: "hsl(var(--plantation-muted))",
        },
        golden: {
          DEFAULT: "hsl(var(--golden-palm))",
          light: "hsl(var(--golden-palm-light))",
          dark: "hsl(var(--golden-palm-dark))",
        },
        sage: {
          DEFAULT: "hsl(var(--sage))",
          light: "hsl(var(--sage-light))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...require("tailwindcss/defaultTheme").fontFamily.sans],
      },
      // Subtle shadows for modern flat design with depth
      boxShadow: {
        'subtle-sm': 'var(--shadow-sm)',
        'subtle-md': 'var(--shadow-md)',
        'subtle-lg': 'var(--shadow-lg)',
        'subtle-xl': 'var(--shadow-xl)',
        'elevated': 'var(--shadow-elevated)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "golden-glow-pulse": {
          from: {
            textShadow: `
              0 0 5px hsl(var(--golden-palm) / 0.8),
              0 0 10px hsl(var(--golden-palm) / 0.6),
              0 0 15px hsl(var(--golden-palm) / 0.4)
            `,
          },
          to: {
            textShadow: `
              0 0 8px hsl(var(--golden-palm) / 0.9),
              0 0 15px hsl(var(--golden-palm) / 0.7),
              0 0 20px hsl(var(--golden-palm) / 0.5)
            `,
          },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
        "fade-out": "fade-out 0.3s ease-in-out",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "golden-glow-pulse": "golden-glow-pulse 2s ease-in-out infinite alternate",
        "scale-in": "scale-in 0.2s ease-out",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Transition timing functions
      transitionTimingFunction: {
        'theme': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Transition durations
      transitionDuration: {
        'theme': '200ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
