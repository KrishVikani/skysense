import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SettingsProvider } from "@/components/SettingsProvider";
import { LocationProvider } from "@/components/LocationProvider";
import { MotionProvider } from "@/components/MotionProvider";
import { EnvironmentalProvider } from "@/components/EnvironmentalProvider";
import { StartupSplash } from "@/components/onboarding/StartupSplash";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata = {
  title: "SKYSENSE",
  description: "AI-powered personal environmental intelligence platform",
  keywords: ["weather", "environment", "AI", "intelligence", "air quality"],
}

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
}

// Apply the saved theme before first paint to avoid a flash of wrong theme.
const themeBootScript = `(function(){try{var t=null;try{t=localStorage.getItem("theme");}catch(e){}if(t!=="light"&&t!=="dark"&&t!=="system"){t="system";}var system=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var theme=t==="system"?system:t;var root=document.documentElement;root.classList.remove("light","dark");root.classList.add(theme);}catch(e){var root=document.documentElement;root.classList.remove("light","dark");root.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <LocationProvider>
                <MotionProvider>
                  <EnvironmentalProvider>
                    <StartupSplash />
                    <OnboardingGate>
                      {children}
                    </OnboardingGate>
                  </EnvironmentalProvider>
                </MotionProvider>
              </LocationProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}