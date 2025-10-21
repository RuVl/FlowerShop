import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import ProductAdmin from './components/ProductAdmin';
import UsersAdmin from './components/UsersAdmin';
import Dashboard from './components/Dashboard';
import AdminOrders from './components/AdminOrders';
import SourcesAdmin from './components/SourcesAdmin';
import StatisticsAdmin from './components/StatisticsAdmin';
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import BroadcastAdmin from './components/BroadcastAdmin';

const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

const App: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}>
            <Sidebar activeIndex={activeIndex} onChange={setActiveIndex}/>
            <MainContent>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={contentVariants}
                        transition={{ duration: 0.4 }}
                        style={{ width: '100%' }}
                    >
                        {activeIndex === 0 && (
                            <Dashboard/>
                        )}
                        {activeIndex === 1 && (
                            <UsersAdmin/>
                        )}
                        {activeIndex === 2 && (
                            <AdminOrders/>
                        )}
                        {activeIndex === 3 && (
                            <StatisticsAdmin/>
                        )}
                        {activeIndex === 4 && (
                            <ProductAdmin/>
                        )}
                        {activeIndex === 5 && (
                            <BroadcastAdmin/>
                        )}
                        {activeIndex === 6 && (
                            <SourcesAdmin/>
                        )}
                    </motion.div>
                </AnimatePresence>
            </MainContent>
        </Box>
    );
};

export default App;