import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children, college }) => {
    const [colors, setColors] = useState(college?.brandColors || {
        primary: "#1e40af",
        secondary: "#374151",
        accent: "#059669",
        surface: "#f8fafc",
        text: "#1f2937"
    });

    // Function to apply theme to CSS variables
    const applyThemeToDocument = (newColors) => {
        const root = document.documentElement;

        // Convert hex to RGB for opacity variations
        const hexToRgb = (hex) => {
            hex = hex.replace(/^#/, '');
            const bigint = parseInt(hex, 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255
            };
        };

        // Set CSS custom properties
        Object.entries(newColors).forEach(([key, value]) => {
            if (key === 'primary' || key === 'secondary' || key === 'accent') {
                const rgb = hexToRgb(value);
                root.style.setProperty(`--color-${key}`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);

                // Generate opacity variants
                [50, 100, 200, 300, 500, 700, 900].forEach(opacity => {
                    const alpha = opacity / 1000;
                    root.style.setProperty(
                        `--color-${key}-${opacity}`,
                        `${rgb.r}, ${rgb.g}, ${rgb.b}`
                    );
                });
            } else {
                // For surface and text
                const rgb = hexToRgb(value);
                root.style.setProperty(`--color-${key}`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }
        });

        // Generate gradient variations
        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${newColors.primary} 0%, ${newColors.accent} 100%)`);
        root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${newColors.secondary} 0%, ${newColors.primary} 100%)`);
        root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${newColors.accent} 0%, ${newColors.primary} 100%)`);
    };
    // Apply theme on initial load and when colors change
    useEffect(() => {
        applyThemeToDocument(colors);
    }, [colors]);
    useEffect(() => {
        if (college?.brandColors) {
            setColors(college.brandColors);
            applyThemeToDocument(college.brandColors);
        }
    }, [college]);

    // Make applyThemeToDocument available globally
    useEffect(() => {
        window.applyThemeToDocument = applyThemeToDocument;
    }, []);

    const value = {
        colors,
        setColors,
        applyTheme: applyThemeToDocument
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};