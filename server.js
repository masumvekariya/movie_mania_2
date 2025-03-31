require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const { auth } = require('express-openid-connect');

const app = express();

// Auth0 configuration
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL
};

// Auth0 middleware
app.use(auth(config));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Middleware to check authentication status
const checkAuthenticated = (req, res, next) => {
    if (!req.oidc.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
};

// Auth routes
app.get('/login', (req, res) => {
    if (req.oidc.isAuthenticated()) {
        return res.redirect('/');
    }
    res.oidc.login({
        returnTo: '/',
        authorizationParams: {
            prompt: 'login'
        }
    });
});

// Middleware to pass auth state to all views
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.oidc.isAuthenticated();
    res.locals.user = req.oidc.user;
    next();
});

// Routes
app.get('/', async (req, res) => {
    try {
        const searchQuery = req.query.search;
        let movies;

        if (searchQuery) {
            // Search for both movies and TV shows
            const [movieResponse, tvResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${searchQuery}`),
                axios.get(`https://api.themoviedb.org/3/search/tv?api_key=${process.env.TMDB_API_KEY}&query=${searchQuery}`)
            ]);

            // Combine and format results
            const movieResults = movieResponse.data.results.map(item => ({
                ...item,
                media_type: 'movie'
            }));

            const tvResults = tvResponse.data.results.map(item => ({
                ...item,
                title: item.name,
                release_date: item.first_air_date,
                media_type: 'tv'
            }));

            movies = [...movieResults, ...tvResults]
                .sort((a, b) => b.popularity - a.popularity)
                .slice(0, 20);
        } else {
            // Fetch popular movies if no search query
            const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}`);
            movies = response.data.results;
        }

        res.render('index', { movies, searchQuery: searchQuery || '' });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

// Profile route
app.get('/profile', checkAuthenticated, (req, res) => {
    res.render('profile');
});

// Movies route
app.get('/movies', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search;
        const sort = req.query.sort || 'popularity';

        let endpoint = searchQuery
            ? `search/movie?query=${searchQuery}&page=${page}`
            : `movie/popular?page=${page}`;

        if (sort === 'rating') {
            endpoint = `movie/top_rated?page=${page}`;
        } else if (sort === 'release') {
            endpoint = `movie/now_playing?page=${page}`;
        }

        const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}&api_key=${process.env.TMDB_API_KEY}`);
        const movies = response.data.results;

        res.render('movies', { movies, currentPage: page });
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).send('Error fetching movies');
    }
});

// TV Series route
app.get('/tv', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search;
        const sort = req.query.sort || 'popularity';

        let endpoint = searchQuery
            ? `search/tv?query=${searchQuery}&page=${page}`
            : `tv/popular?page=${page}`;

        if (sort === 'rating') {
            endpoint = `tv/top_rated?page=${page}`;
        } else if (sort === 'first_air_date') {
            endpoint = `tv/on_the_air?page=${page}`;
        }

        const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}&api_key=${process.env.TMDB_API_KEY}`);
        const shows = response.data.results;

        res.render('tv', { shows, currentPage: page });
    } catch (error) {
        console.error('Error fetching TV shows:', error);
        res.status(500).send('Error fetching TV shows');
    }
});

// Top Rated route
app.get('/top-rated', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const contentType = req.query.type || 'all';
        const searchQuery = req.query.search;

        let content = [];

        if (contentType === 'movies' || contentType === 'all') {
            const movieResponse = await axios.get(
                `https://api.themoviedb.org/3/movie/top_rated?api_key=${process.env.TMDB_API_KEY}&page=${page}`
            );
            content = [...content, ...movieResponse.data.results.map(item => ({ ...item, media_type: 'movie' }))];
        }

        if (contentType === 'tv' || contentType === 'all') {
            const tvResponse = await axios.get(
                `https://api.themoviedb.org/3/tv/top_rated?api_key=${process.env.TMDB_API_KEY}&page=${page}`
            );
            content = [...content, ...tvResponse.data.results.map(item => ({
                ...item,
                title: item.name,
                release_date: item.first_air_date,
                media_type: 'tv'
            }))];
        }

        if (searchQuery) {
            content = content.filter(item =>
                (item.title || item.name).toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        content.sort((a, b) => b.vote_average - a.vote_average);

        res.render('top-rated', { content, currentPage: page, contentType });
    } catch (error) {
        console.error('Error fetching top rated content:', error);
        res.status(500).send('Error fetching top rated content');
    }
});

// Upcoming route
app.get('/upcoming', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const timeframe = req.query.timeframe || 'month';
        const searchQuery = req.query.search;

        let response = await axios.get(
            `https://api.themoviedb.org/3/movie/upcoming?api_key=${process.env.TMDB_API_KEY}&page=${page}`
        );

        let movies = response.data.results;

        // Filter movies based on timeframe
        const now = new Date();
        const filterDate = new Date();
        if (timeframe === 'week') {
            filterDate.setDate(filterDate.getDate() + 7);
        } else if (timeframe === 'month') {
            filterDate.setMonth(filterDate.getMonth() + 1);
        } else { // year
            filterDate.setFullYear(filterDate.getFullYear() + 1);
        }

        movies = movies.filter(movie => {
            const releaseDate = new Date(movie.release_date);
            return releaseDate > now && releaseDate <= filterDate;
        });

        if (searchQuery) {
            movies = movies.filter(movie =>
                movie.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        movies.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

        res.render('upcoming', { movies, currentPage: page, timeframe });
    } catch (error) {
        console.error('Error fetching upcoming movies:', error);
        res.status(500).send('Error fetching upcoming movies');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});