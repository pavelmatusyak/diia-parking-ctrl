// Design System - Consistent styling across all pages
// Main colors: Black, White, Silver

export const DesignSystem = {
    colors: {
        primary: '#000000',           // Black
        secondary: '#FFFFFF',         // White
        accent: '#C0C0C0',            // Silver

        // Grays
        gray50: '#F9FAFB',
        gray100: '#F3F4F6',
        gray200: '#E5E7EB',
        gray300: '#D1D5DB',
        gray400: '#9CA3AF',
        gray500: '#6B7280',
        gray600: '#4B5563',
        gray700: '#374151',
        gray800: '#1F2937',
        gray900: '#111827',

        // Status colors
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',

        // UI elements
        background: '#FFFFFF',
        surface: '#F9FAFB',
        border: '#E5E7EB',
        divider: '#F3F4F6',

        // Text
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        textInverse: '#FFFFFF',
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
        full: 9999,
    },

    typography: {
        h1: {
            fontSize: 36,
            fontWeight: '800' as const,
            letterSpacing: -1,
        },
        h2: {
            fontSize: 28,
            fontWeight: '700' as const,
            letterSpacing: -0.5,
        },
        h3: {
            fontSize: 22,
            fontWeight: '700' as const,
            letterSpacing: -0.3,
        },
        h4: {
            fontSize: 18,
            fontWeight: '600' as const,
            letterSpacing: -0.2,
        },
        body: {
            fontSize: 16,
            fontWeight: '500' as const,
            letterSpacing: -0.1,
        },
        bodySmall: {
            fontSize: 14,
            fontWeight: '500' as const,
            letterSpacing: -0.1,
        },
        caption: {
            fontSize: 12,
            fontWeight: '500' as const,
            letterSpacing: 0,
        },
    },

    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
        },
    },

    buttons: {
        primary: {
            backgroundColor: '#000000',
            borderRadius: 30,
            paddingVertical: 18,
            paddingHorizontal: 32,
            minHeight: 60,
        },
        secondary: {
            backgroundColor: '#F3F4F6',
            borderRadius: 30,
            paddingVertical: 18,
            paddingHorizontal: 32,
            minHeight: 60,
        },
        text: {
            primary: {
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '700' as const,
                letterSpacing: -0.2,
            },
            secondary: {
                color: '#111827',
                fontSize: 18,
                fontWeight: '700' as const,
                letterSpacing: -0.2,
            },
        },
    },
};
