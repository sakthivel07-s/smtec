import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(
        localStorage.getItem("theme") || "system"
    );

    useEffect(() => {
        const root = window.document.documentElement;
        console.log("Theme changing to:", theme);

        // Remove old classes immediately to prevent conflicts
        root.classList.remove("light", "dark");

        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

            const applySystemTheme = () => {
                const newTheme = mediaQuery.matches ? "dark" : "light";
                root.classList.remove("light", "dark");
                root.classList.add(newTheme);
                root.style.colorScheme = newTheme;
                console.log("Applied system theme:", newTheme);
            };

            // Apply initially
            applySystemTheme();

            // Listen for changes
            mediaQuery.addEventListener("change", applySystemTheme);

            return () => {
                mediaQuery.removeEventListener("change", applySystemTheme);
            };
        } else {
            // Manual theme
            root.classList.add(theme);
            root.style.colorScheme = theme;
            console.log("Applied manual theme:", theme);
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
