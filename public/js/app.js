// DOM Elements
const trendingMoviesContainer = document.getElementById('trending-movies');
const popularSeriesContainer = document.getElementById('popular-series');
const searchInput = document.querySelector('input[type="search"]');

// API Functions
async function fetchTrendingMovies() {
    try {
        const response = await fetch('/api/movies/trending');
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        return [];
    }
}

async function searchMovies(query) {
    try {
        const response = await fetch(`/api/movies/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error searching movies:', error);
        return [];
    }
}

// UI Functions
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105';
    
    const imageUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${movie.title}" class="w-full h-96 object-cover">
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-2">${movie.title}</h3>
            <div class="flex items-center mb-2">
                <span class="text-accent">⭐</span>
                <span class="ml-1">${movie.vote_average.toFixed(1)}</span>
            </div>
            <p class="text-gray-400 text-sm line-clamp-2">${movie.overview}</p>
        </div>
    `;

    card.addEventListener('click', () => showMovieDetails(movie.id));
    return card;
}

async function showMovieDetails(movieId) {
    try {
        const response = await fetch(`/api/movies/${movieId}`);
        const movie = await response.json();
        // TODO: Implement modal or navigation to movie details page
        console.log('Movie details:', movie);
    } catch (error) {
        console.error('Error fetching movie details:', error);
    }
}

// Event Listeners
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query) {
            const movies = await searchMovies(query);
            trendingMoviesContainer.innerHTML = '';
            movies.forEach(movie => {
                trendingMoviesContainer.appendChild(createMovieCard(movie));
            });
        } else {
            initializePage();
        }
    }, 500);
});

// Initialize Page
async function initializePage() {
    const trendingMovies = await fetchTrendingMovies();
    trendingMoviesContainer.innerHTML = '';
    trendingMovies.forEach(movie => {
        trendingMoviesContainer.appendChild(createMovieCard(movie));
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', initializePage);