import type { SxProps, Theme } from '@mui/material/styles';

export const boardBgSx: SxProps<Theme> = {
  minHeight: '100vh',
  background: `
    repeating-conic-gradient(var(--cork-dark) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px,
    linear-gradient(160deg, var(--cork) 0%, var(--cork-dark) 50%, var(--cork-light) 100%)`,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'fixed',
    inset: 0,
    background: `
      radial-gradient(ellipse at 30% 20%, rgba(212, 184, 130, 0.3) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 80%, rgba(168, 137, 63, 0.2) 0%, transparent 50%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },
};

export const paperCardSx: SxProps<Theme> = {
  bgcolor: 'var(--paper)',
  borderRadius: 0,
  boxShadow: 'var(--shadow-card-rest)',
  transition: 'var(--ease-card)',
  position: 'relative',
  '&:hover': {
    boxShadow: 'var(--shadow-card-lift)',
  },
};

export const pinBaseSx: SxProps<Theme> = {
  position: 'absolute',
  top: -8,
  width: 20,
  height: 20,
  borderRadius: '50%',
  boxShadow: `
    0 2px 4px var(--shadow-pin),
    inset 0 -2px 3px rgba(0, 0, 0, 0.15),
    inset 0 2px 3px rgba(255, 255, 255, 0.3)`,
  zIndex: 2,
};

export const pinRedSx: SxProps<Theme> = {
  ...pinBaseSx as object,
  background: 'radial-gradient(circle at 35% 35%, #e85545, var(--pushpin-red) 60%, #993322)',
  left: '50%',
  transform: 'translateX(-50%)',
};

export const pinGreenSx: SxProps<Theme> = {
  ...pinBaseSx as object,
  background: 'radial-gradient(circle at 35% 35%, #7aa87d, var(--thumbtack-green) 60%, #4a6a4d)',
  right: 20,
};

export const pinBlueSx: SxProps<Theme> = {
  ...pinBaseSx as object,
  background: 'radial-gradient(circle at 35% 35%, #4a6a9a, var(--ink-blue) 60%, #1a3050)',
  left: 20,
};

export const ctaButtonSx: SxProps<Theme> = {
  py: '14px',
  px: '48px',
  bgcolor: 'var(--pushpin-red)',
  color: 'var(--paper)',
  fontFamily: 'var(--font-condensed), sans-serif',
  fontWeight: 700,
  fontSize: '1rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderRadius: 0,
  boxShadow: 'none',
  transition: 'var(--ease-button)',
  '&:hover': {
    bgcolor: 'var(--pushpin-red-hover)',
    transform: 'scale(1.03)',
    boxShadow: 'none',
  },
};
