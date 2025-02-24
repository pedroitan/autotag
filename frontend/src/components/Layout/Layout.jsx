import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import CollectionsIcon from '@mui/icons-material/Collections';

const Layout = ({ children }) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Split children into an array if it's not already
  const childrenArray = React.Children.toArray(children);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AutoTag Drive
          </Typography>
        </Toolbar>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{ bgcolor: 'primary.dark' }}
        >
          <Tab icon={<HomeIcon />} label="Dashboard" />
          <Tab icon={<CollectionsIcon />} label="Gallery" />
        </Tabs>
      </AppBar>
      
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        {childrenArray.map((child, index) => (
          <Box
            key={index}
            role="tabpanel"
            hidden={currentTab !== index}
            sx={{ height: '100%' }}
          >
            {currentTab === index && child}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Layout;
