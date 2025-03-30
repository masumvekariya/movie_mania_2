const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
try {
    const envPath = path.resolve(process.cwd(), '.env');
    console.log('Loading .env file from:', envPath);
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
        throw new Error(`Failed to load .env file: ${result.error.message}`);
    }
    
    console.log('Environment variables loaded successfully');
    console.log('Available environment variables:', Object.keys(process.env));
} catch (error) {
    console.error('Error during environment setup:', error.message);
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// TheMovieDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Configure axios instance
const tmdb = axios.create({
    baseURL: TMDB_BASE_URL,
    timeout: 10000,
    params: {
        api_key: TMDB_API_KEY
    }
});

// Validate environment
function validateEnvironment() {
    console.log('Validating TMDB_API_KEY:', TMDB_API_KEY ? 'Present' : 'Missing');
    if (!TMDB_API_KEY) {
        throw new Error('TMDB API key is not configured. Please check your .env file.');
    }
    console.log('Environment validation successful');
}

// Initialize server
async function initializeServer() {
    try {
        validateEnvironment();
        
        // Test API connection
        const response = await tmdb.get('/configuration');
        if (response.status === 200) {
            console.log('Successfully connected to TMDB API');
            
            // Start server only after successful API connection
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        }
    } catch (error) {
        console.error('Server initialization failed:', error.message);
        process.exit(1);
    }
}

// Validate API key
if (!TMDB_API_KEY) {
    console.error('TMDB API key is not configured. Please set TMDB_API_KEY in your .env file');
    process.exit(1);
}

// API Routes
app.get('/api/movies/trending', async (req, res) => {
    try {
        const response = await tmdb.get('/trending/movie/week');
        if (!response.data?.results) {
            throw new Error('Invalid response from TMDB API');
        }
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching trending movies:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch trending movies',
            message: error.message
        });
    }
});

app.get('/api/movies/search', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    try {
        const response = await tmdb.get('/search/movie', {
            params: { query: query }
        });
        if (!response.data?.results) {
            throw new Error('Invalid response from TMDB API');
        }
        res.json(response.data);
    } catch (error) {
        console.error('Error searching movies:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to search movies',
            message: error.message
        });
    }
});

app.get('/api/movies/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await tmdb.get(`/movie/${id}`);
        if (!response.data) {
            throw new Error('Invalid response from TMDB API');
        }
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching movie details:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch movie details',
            message: error.message
        });
    }
});

app.get('/api/tv/popular', async (req, res) => {
    try {
        const response = await tmdb.get('/tv/popular');
        if (!response.data?.results) {
            throw new Error('Invalid response from TMDB API');
        }
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching popular TV series:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch popular TV series',
            message: error.message
        });
    }
});

// Serve static files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize the server
initializeServer();