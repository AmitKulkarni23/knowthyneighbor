import ThemeRegistry from '@/components/ThemeRegistry';
import AppNavBar from '@/components/AppNavBar';
import Box from '@mui/material/Box';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry>
      <AppNavBar />
      <Box
        component="main"
        sx={{
          maxWidth: 960,
          mx: 'auto',
          px: 2,
          py: 3,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </ThemeRegistry>
  );
}
