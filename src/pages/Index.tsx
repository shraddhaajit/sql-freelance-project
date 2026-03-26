import React, { useState } from 'react';
import { DataProvider } from '@/context/DataContext';
import AppLayout from '@/components/AppLayout';
import ClientDashboard from '@/components/ClientDashboard';
import FreelancerDashboard from '@/components/FreelancerDashboard';
import { AnimatePresence, motion } from 'framer-motion';

const Index: React.FC = () => {
  const [activeView, setActiveView] = useState<'client' | 'freelancer'>('client');

  return (
    <DataProvider>
      <AppLayout activeView={activeView} onViewChange={setActiveView}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {activeView === 'client' ? <ClientDashboard /> : <FreelancerDashboard />}
          </motion.div>
        </AnimatePresence>
      </AppLayout>
    </DataProvider>
  );
};

export default Index;
