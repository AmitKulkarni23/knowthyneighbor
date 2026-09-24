import ThemeRegistry from '@/components/ThemeRegistry';
import Box from '@mui/material/Box';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 2,
        }}
      >
        {children}
      </Box>
    </ThemeRegistry>
  );
}
