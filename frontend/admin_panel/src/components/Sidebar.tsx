import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BarChartIcon from '@mui/icons-material/BarChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CampaignIcon from '@mui/icons-material/Campaign';
import AdsIcon from '@mui/icons-material/AdsClick';

import logo from '../assets/icons/logo.svg';

export const menuItems = [
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

const Sidebar: React.FC<SidebarProps> = ({ activeIndex, onChange }) => (
    <Box
        sx={{
            width: 240,
            height: '100vh',
            bgcolor: '#ffffff',
            px: 2,
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Nunito, system-ui, Arial, sans-serif',
            boxShadow: 'none',
        }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img src={logo} alt="logo" style={{ width: 120, height: 60 }}/>
        </Box>
        <List>
            {menuItems.map((item, idx) => (
                <ListItemButton
                    key={item.label}
                    selected={activeIndex === idx}
                    onClick={() => onChange(idx)}
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
                    <ListItemIcon
                        sx={{
                            color: activeIndex === idx ? '#5485E4' : '#848391',
                            minWidth: 36,
                        }}
                    >
                        {item.icon}
                    </ListItemIcon>
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
    </Box>
);

export default Sidebar;