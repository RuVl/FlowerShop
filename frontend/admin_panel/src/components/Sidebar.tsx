import React, { useState } from 'react';
import { Box, Button, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BarChartIcon from '@mui/icons-material/BarChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CampaignIcon from '@mui/icons-material/Campaign';
import AdsIcon from '@mui/icons-material/AdsClick';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/icons/logo.svg';

const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon/> },
    { label: 'Пользователи', icon: <PeopleIcon/> },
    { label: 'Заказы', icon: <ShoppingCartIcon/> },
    { label: 'Статистика', icon: <BarChartIcon/> },
    { label: 'Товары', icon: <InventoryIcon/> },
    { label: 'Рассылки', icon: <CampaignIcon/> },
    { label: 'Реклама', icon: <AdsIcon/> },
];

interface SidebarProps {
    activeIndex: number;
    onChange: (idx: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeIndex, onChange }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { logout } = useAuth();

    const toggleDrawer = () => {
        setOpen(!open);
    };

    const SidebarContent = (
        <Box sx={{
            height: '100vh',
            bgcolor: '#ffffff',
            px: 2,
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Nunito, system-ui, Arial, sans-serif',
            boxShadow: 'none',
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, position: 'relative' }}>
                <img src={logo} alt="logo" style={{ width: 120, height: 60 }}/>
                <Box sx={{ position: 'absolute', right: 0, top: 0, display: { xs: 'block', md: 'none' } }}>
                    <IconButton onClick={toggleDrawer}>
                        <CloseIcon/>
                    </IconButton>
                </Box>
            </Box>
            <List>
                {menuItems.map((item, idx) => (
                    <ListItemButton
                        key={item.label}
                        selected={activeIndex === idx}
                        onClick={() => {
                            onChange(idx);
                            if (isMobile) {
                                setOpen(false);
                            }
                        }}
                        sx={{
                            mb: 2,
                            borderRadius: 2,
                            bgcolor: activeIndex === idx ? '#E8F0FB' : 'transparent',
                            color: activeIndex === idx ? '#5485E4' : '#848391',
                            pl: 2,
                            fontFamily: 'Nunito, system-ui, Arial, sans-serif',
                            fontWeight: 400,
                            fontSize: 18,
                            transition: 'background 0.2s, color 0.2s',
                            '&:hover': {
                                bgcolor: '#E8F0FB',
                                color: '#5485E4',
                            },
                        }}
                    >
                        <ListItemIcon sx={{
                            color: activeIndex === idx ? '#5485E4' : '#848391',
                            minWidth: 36,
                        }}>{item.icon}</ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                                fontSize: 18,
                                fontWeight: 400,
                                fontFamily: 'Nunito, system-ui, Arial, sans-serif',
                            }}
                        />
                    </ListItemButton>
                ))}
            </List>
            <Box sx={{ mt: '150px', px: 2 }}>
                <Button
                    startIcon={<LogoutIcon/>}
                    onClick={logout}
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        bgcolor: '#5485E4',
                        color: '#E8F0FB',
                        fontFamily: 'Nunito, system-ui, Arial, sans-serif',
                        fontSize: 18,
                        fontWeight: 400,
                        textTransform: 'none',
                    }}
                > Выход </Button>
            </Box>
        </Box>
    );

    const MiniSidebarContent = (
        <Box
            sx={{
                width: 60,
                height: '100vh',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 4,
                boxShadow: 'none',
            }}
        >
            <List sx={{ width: '100%', flexGrow: 1 }}>
                {menuItems.map((item, idx) => (
                    <ListItemButton
                        key={item.label}
                        selected={activeIndex === idx}
                        onClick={() => onChange(idx)}
                        sx={{
                            justifyContent: 'center',
                            px: 0,
                            minHeight: 48,
                            bgcolor: activeIndex === idx ? '#E8F0FB' : 'transparent',
                            color: activeIndex === idx ? '#5485E4' : '#848391',
                            transition: 'background 0.2s, color 0.2s',
                            '&:hover': {
                                bgcolor: '#E8F0FB',
                                color: '#5485E4',
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                color: activeIndex === idx ? '#5485E4' : '#848391',
                                minWidth: 0,
                            }}
                        >
                            {item.icon}
                        </ListItemIcon>
                    </ListItemButton>
                ))}
                <ListItemButton
                    onClick={toggleDrawer}
                    sx={{
                        justifyContent: 'center',
                        px: 0,
                        minHeight: 48,
                        mt: 2,
                    }}
                >
                    <ListItemIcon
                        sx={{
                            minWidth: 0,
                            color: '#848391',
                        }}
                    >
                        <ChevronRightIcon/>
                    </ListItemIcon>
                </ListItemButton>
            </List>
        </Box>
    );

    return (
        <>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                {SidebarContent}
            </Box>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {MiniSidebarContent}
            </Box>
            <Drawer
                anchor="left"
                open={open}
                onClose={toggleDrawer}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: 240,
                        boxSizing: 'border-box',
                    },
                }}
            >
                {SidebarContent}
            </Drawer>
        </>
    );
};

export default Sidebar;