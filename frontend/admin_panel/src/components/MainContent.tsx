import React from 'react';
import { Box } from '@mui/material';

const MainContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <Box
        sx={{
            flex: 1,
            mt: 4,
            background: '#fff',
            borderTopLeftRadius: '30px',
            boxShadow: 'inset 0 8px 32px -12px rgb(0 32 94 / 27%)',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            p: { xs: 1.5, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            minHeight: { xs: 'calc(100vh - 16px)', md: 'calc(100vh - 32px)' },
            overflowX: 'hidden'
        }}
    >
        {children}
    </Box>
);

export default MainContent;