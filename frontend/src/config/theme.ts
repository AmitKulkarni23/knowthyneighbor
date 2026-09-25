'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#CC4433',
      light: '#D96B5C',
      dark: '#B83A2C',
      contrastText: '#FDF8ED',
    },
    secondary: {
      main: '#5B7F5E',
      light: '#7A9A7D',
      dark: '#4A6A4D',
      contrastText: '#FDF8ED',
    },
    background: {
      default: '#C4A366',
      paper: '#FDF8ED',
    },
    text: {
      primary: '#2B4570',
      secondary: '#3D5A8A',
    },
    error: {
      main: '#CC4433',
    },
    success: {
      main: '#5B7F5E',
    },
    divider: '#D4B882',
  },
  typography: {
    fontFamily: 'var(--font-body), "Source Sans 3", Georgia, serif',
    h1: {
      fontFamily: 'var(--font-marker), cursive',
      fontWeight: 400,
      fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
      lineHeight: 1.2,
      color: '#2B4570',
    },
    h2: {
      fontFamily: 'var(--font-marker), cursive',
      fontWeight: 400,
      fontSize: '1.5rem',
      lineHeight: 1.2,
      color: '#2B4570',
    },
    h3: {
      fontFamily: 'var(--font-condensed), sans-serif',
      fontWeight: 700,
      fontSize: '1.1rem',
      lineHeight: 1.3,
      letterSpacing: '0.02em',
      color: '#2B4570',
    },
    h6: {
      fontFamily: 'var(--font-marker), cursive',
      fontWeight: 400,
      fontSize: '1.2rem',
      color: '#2B4570',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontFamily: 'var(--font-handwriting), cursive',
      fontSize: '0.95rem',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: 'var(--font-condensed), sans-serif',
      textTransform: 'uppercase' as const,
      fontWeight: 700,
      letterSpacing: '0.04em',
    },
    caption: {
      fontFamily: 'var(--font-handwriting), cursive',
      fontSize: '0.85rem',
    },
  },
  shape: {
    borderRadius: 0,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            transform: 'scale(1.02)',
          },
        },
        outlined: {
          borderColor: '#2B4570',
          color: '#2B4570',
          '&:hover': {
            borderColor: '#CC4433',
            color: '#CC4433',
            backgroundColor: 'rgba(204, 68, 51, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '2px 3px 8px rgba(60, 40, 20, 0.18), 0 1px 2px rgba(60, 40, 20, 0.1)',
          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
          '&:hover': {
            boxShadow: '3px 6px 16px rgba(60, 40, 20, 0.18), 0 2px 4px rgba(60, 40, 20, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: 'var(--font-condensed), sans-serif',
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.03em',
          textTransform: 'uppercase' as const,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'standard',
        size: 'medium',
      },
      styleOverrides: {
        root: {
          '& .MuiInput-underline:before': {
            borderBottomColor: '#D4B882',
          },
          '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
            borderBottomColor: '#2B4570',
          },
          '& .MuiInput-underline:after': {
            borderBottomColor: '#2B4570',
          },
          '& .MuiInputLabel-root': {
            fontFamily: 'var(--font-handwriting), cursive',
            color: '#3D5A8A',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          boxShadow: '3px 6px 16px rgba(60, 40, 20, 0.18), 0 2px 4px rgba(60, 40, 20, 0.12)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px rgba(60, 40, 20, 0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: 'var(--font-handwriting), cursive',
        },
      },
    },
  },
});

export default theme;
