const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from dist directory
app.use(express.static('dist'));

// Set environment variable for development
process.env.NODE_ENV = 'development';

app.listen(port, () => {
  console.log(`Development server running at http://localhost:${port}`);
  console.log('This server provides IntelliSense for Three.js types');
});
