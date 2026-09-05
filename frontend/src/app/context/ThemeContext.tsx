import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "app-theme";

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
    if (theme === "system") return getSystemTheme();
    return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === "undefined") return "light";
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light" || stored === "system") return stored;
        return "light";
    });

    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(theme));

    useEffect(() => {
        const resolved = resolveTheme(theme);
        setResolvedTheme(resolved);

        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
    }, [theme]);

    useEffect(() => {
        if (theme !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            const resolved = resolveTheme("system");
            setResolvedTheme(resolved);
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(resolved);
        };

        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
