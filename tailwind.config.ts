// tailwind.config.ts (theme.extend)
import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        brand: {
          DEFAULT: "#7CB342", light: "#91C145", dark: "#445B21", mid: "#5A8F2F", deep: "#558B2F",
          deeper: "#3D6B1F", ink: "#4C6524", assess: "#8BC34A"
        },
        surface: {
          app: "#1A1A1A", card: "#1E1E1E", input: "#252525", raised: "#2D2D2D",
          line: "#333333", "line-strong": "#3D3D3D", divider: "#444444",
          nav: "#D9D9D9", light: "#F5F5F5", skeleton: "#2A2A2A", "skeleton-hi": "#3A3A3A"
        },
        ink: { dark: "#333333", muted: "#666666", placeholder: "#AAAAAA", underline: "#DDDDDD" },
        warning: { DEFAULT: "#E6A23C", dark: "#D4911F" },
        alert: { orange: "#FF9800", offline: "#FFA000", "deep-orange": "#FF7043", teal: "#26A69A" },
        danger: { DEFAULT: "#F44336", strong: "#D32F2F", soft: "#EF5350", deep: "#B71C1C", wine: "#8B2E2E" },
        info: { DEFAULT: "#2196F3", light: "#42A5F5", water: "#1E88E5" },
        tone: { rose: "#E35D67", purple: "#AB47BC", "purple-tag": "#7B1FA2" },
        macro: { kcal: "#64B5F6", protein: "#E57373", carb: "#FFD54F", fat: "#81C784", neutral: "#4B5D73" },
        status: { paid: "#7CB342", pending: "#E6A23C", awaiting: "#2196F3", suspended: "#B71C1C", none: "#9E9E9E" },
        group: { biset: "#E53935", triset: "#FF9800" },
        effort: { 1: "#7CB342", 2: "#2196F3", 3: "#FF9800", 4: "#FF5722", 5: "#D32F2F" },
        whatsapp: { DEFAULT: "#25D366", dark: "#128C7E" },
        grey: { 100: "#F5F5F5", 200: "#EEEEEE", 300: "#E0E0E0", 400: "#BDBDBD", 500: "#9E9E9E", 600: "#757575", 700: "#616161", 800: "#424242", 850: "#303030", 900: "#212121" }
      },
      // shadcn: lg/md/sm derivam de --radius (12px) => 12 / 10 / 8 — bate exatamente com o app
      borderRadius: {
        lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)",
        xs: "4px", tag: "6px", card: "16px", bubble: "18px", sheet: "20px", "sheet-lg": "24px",
        "btn-pill": "27px", menu: "30px", nav: "17px"
      },
      // tamanhos em px exatos do app (não sobrescreve text-sm/base do shadcn): use text-rt-13, text-rt-42...
      fontSize: {
        "rt-6": ["6px", "1.2"], "rt-8": ["8px", "1.2"], "rt-9": ["9px", "1.2"], "rt-10": ["10px", "1.3"], "rt-11": ["11px", "1.35"],
        "rt-12": ["12px", "1.4"], "rt-13": ["13px", "1.4"], "rt-14": ["14px", "1.4"], "rt-15": ["15px", "1.3"],
        "rt-16": ["16px", "1.3"], "rt-17": ["17px", "1.25"], "rt-18": ["18px", "1.2"], "rt-20": ["20px", "1.2"],
        "rt-22": ["22px", "1.2"], "rt-24": ["24px", "1.2"], "rt-28": ["28px", "1.1"], "rt-29": ["29px", "1"], "rt-32": ["32px", "1"], "rt-36": ["36px", "0.95"],
        "rt-40": ["40px", "0.95"], "rt-42": ["42px", "0.9"], "rt-72": ["72px", "1"]
      },
      boxShadow: {
        glow: "0 4px 12px rgba(124,179,66,0.30)",
        "glow-active": "0 0 8px 2px rgba(124,179,66,0.40)",
        "glow-lg": "0 4px 16px rgba(124,179,66,0.30)",
        "nav-center": "0 4px 10px rgba(124,179,66,0.40)",
        btn: "0 2px 3px rgba(0,0,0,0.20)",
        header: "0 2px 8px rgba(0,0,0,0.30)",
        "badge-red": "0 2px 6px rgba(239,83,80,0.40)"
      },
      backgroundImage: {
        "brand-v": "linear-gradient(180deg,#91C145 0%,#445B21 100%)",
        "brand-h": "linear-gradient(90deg,#91C145 0%,#445B21 100%)",
        "brand-d": "linear-gradient(135deg,#91C145 0%,#445B21 100%)",
        save: "linear-gradient(180deg,#91C145 0%,#5A8F2F 100%)",
        purchase: "linear-gradient(180deg,#91C145 0%,#7CB342 100%)",
        charge: "linear-gradient(90deg,#7CB342 0%,#558B2F 100%)",
        revenue: "linear-gradient(135deg,#5A8F2F 0%,#3D6B1F 100%)",
        "plan-premium": "linear-gradient(135deg,rgba(124,179,66,0.8) 0%,#558B2F 100%)",
        "plan-free": "linear-gradient(135deg,#C62828 0%,#8B1A1A 50%,#5C1111 100%)",
        "warning-card": "linear-gradient(135deg,#E6A23C 0%,#D4911F 100%)",
        "pay-ok": "linear-gradient(135deg,#2E4A1E 0%,#1E3315 100%)",
        "pay-awaiting": "linear-gradient(135deg,#1E3A5C 0%,#152A42 100%)",
        "pay-suspended": "linear-gradient(135deg,#4A3A1A 0%,#3A2A10 100%)",
        "pay-pending": "linear-gradient(135deg,#8B2E2E 0%,#5C1A1A 50%,#3A1111 100%)",
        water: "linear-gradient(180deg,#42A5F5 0%,#1E88E5 100%)",
        google: "linear-gradient(180deg,#C14545 0%,#5B2121 100%)",
        apple: "linear-gradient(180deg,#333333 0%,#111111 100%)",
        "cancel-red": "linear-gradient(90deg,#C14545 0%,#B54141 12%,#A23A3A 31%,#5B2121 100%)",
        whatsapp: "linear-gradient(90deg,#25D366 0%,#128C7E 100%)",
        gym: "url('/assets/images/background.png')",
        "chat-pattern": "url('/assets/images/whatsapp_chat.png')"
      },
      transitionTimingFunction: {
        "flutter-out": "cubic-bezier(0,0,0.58,1)",
        "flutter-in-out": "cubic-bezier(0.42,0,0.58,1)",
        "out-cubic": "cubic-bezier(0.215,0.61,0.355,1)",
        "in-cubic": "cubic-bezier(0.55,0.055,0.675,0.19)"
      },
      transitionDuration: { 150: "150ms", 200: "200ms", 250: "250ms", 300: "300ms", 400: "400ms", 600: "600ms" },
      keyframes: {
        shimmer: { "0%,100%": { backgroundColor: "#2A2A2A" }, "50%": { backgroundColor: "#3A3A3A" } },
        "slide-up-in": { from: { transform: "translateY(100%)", opacity: "0" }, "50%": { opacity: "1" }, to: { transform: "translateY(0)", opacity: "1" } },
        "pulse-highlight": { "0%,100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(124,179,66,0)" }, "50%": { transform: "scale(1.02)", boxShadow: "0 0 16px 2px rgba(124,179,66,0.4)" } },
        ripple: { from: { width: "125px", height: "125px", opacity: "0.3" }, to: { width: "230px", height: "230px", opacity: "0" } },
        "logo-breathe": { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.06)" } },
        "rec-dot": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
        "pop-elastic": { "0%": { transform: "scale(0)" }, "60%": { transform: "scale(1.12)" }, "80%": { transform: "scale(0.96)" }, "100%": { transform: "scale(1)" } }
      },
      animation: {
        shimmer: "shimmer 2.4s ease-in-out infinite",
        "slide-up-in": "slide-up-in 300ms cubic-bezier(0.215,0.61,0.355,1) both",
        "pulse-highlight": "pulse-highlight 600ms ease-out 1",
        ripple: "ripple 800ms ease-out infinite",
        "logo-breathe": "logo-breathe 800ms ease-in-out",
        "rec-dot": "rec-dot 1s ease-in-out infinite",
        "pop-elastic": "pop-elastic 600ms cubic-bezier(0.34,1.56,0.64,1) both"
      },
      spacing: { "nav-pro": "80px", "nav-student": "105px", "sheet-top": "80px" },
      maxWidth: { app: "430px" }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;