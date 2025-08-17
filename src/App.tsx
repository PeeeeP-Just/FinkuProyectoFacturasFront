import React from 'react';
import { Layout } from './components/Layout';
import { VentasModule } from './components/VentasModule';
import { ComprasModule } from './components/ComprasModule';
import { FlujoCajaModule } from './components/FlujoCajaModule';

interface AppContentProps {
  activeModule?: string;
}

const AppContent: React.FC<AppContentProps> = ({ activeModule }) => {
  switch (activeModule) {
    case 'ventas':
      return <VentasModule />;
    case 'compras':
      return <ComprasModule />;
    case 'flujo-caja':
      return <FlujoCajaModule />;
    default:
      return <VentasModule />;
  }
};

function App() {
  return (
    <Layout>
      <AppContent />
    </Layout>
  );
}

export default App;