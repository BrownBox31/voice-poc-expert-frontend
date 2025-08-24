import React from 'react';
import AppRouter from './services/routes/AppRouter';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <AppRouter />
    </div>
  );
};

export default App;