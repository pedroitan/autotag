import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Gallery from './components/Gallery/Gallery';

// Create a context for sharing directory state
export const DirectoryContext = React.createContext({
  selectedDirectory: null,
  setSelectedDirectory: () => {},
  images: [],
  setImages: () => {},
});

function App() {
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [images, setImages] = useState([]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DirectoryContext.Provider value={{ selectedDirectory, setSelectedDirectory, images, setImages }}>
        <Layout>
          <Dashboard />
          <Gallery />
        </Layout>
      </DirectoryContext.Provider>
    </ThemeProvider>
  );
}

export default App;
