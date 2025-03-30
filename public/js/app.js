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

async function fetchPopularSeries() {
    try {
        const response = await fetch('/api/tv/popular');
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching popular series:', error);
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

async function getAutocompleteSuggestions(query) {
    try {
        const response = await fetch(`/api/movies/autocomplete?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error getting autocomplete suggestions:', error);
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
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="relative">
                    <button class="absolute top-4 right-4 text-white text-2xl" onclick="this.parentElement.parentElement.parentElement.remove()">
                        &times;
                    </button>
                    <div class="flex flex-col md:flex-row">
                        <div class="md:w-1/3">
                            <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'}" 
                                 alt="${movie.title}" class="w-full h-auto object-cover">
                        </div>
                        <div class="p-6 md:w-2/3">
                            <h2 class="text-2xl font-bold mb-2">${movie.title}</h2>
                            <div class="flex items-center mb-4">
                                <span class="text-yellow-500 mr-2">⭐</span>
                                <span>${movie.vote_average.toFixed(1)}/10</span>
                                <span class="mx-2">•</span>
                                <span>${movie.runtime} min</span>
                                <span class="mx-2">•</span>
                                <span>${movie.release_date.split('-')[0]}</span>
                            </div>
                            <p class="text-gray-300 mb-4">${movie.overview}</p>
                            <div class="flex flex-wrap gap-2 mb-4">
                                ${movie.genres.map(genre => `<span class="bg-red-600 text-white px-3 py-1 rounded-full text-sm">${genre.name}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error fetching movie details:', error);
    }
}

// Event Listeners
const searchResultsContainer = document.createElement('div');
searchResultsContainer.className = 'absolute z-50 w-full bg-gray-800 shadow-lg rounded-b-lg max-h-96 overflow-y-auto';
searchResultsContainer.style.display = 'none';
document.querySelector('.search-container').appendChild(searchResultsContainer);

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length > 2) {
        searchTimeout = setTimeout(async () => {
            const suggestions = await getAutocompleteSuggestions(query);
            
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.style.display = 'block';
            
            if (suggestions.length > 0) {
                suggestions.forEach(suggestion => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700';
                    suggestionItem.textContent = suggestion.title;
                    suggestionItem.addEventListener('click', () => {
                        searchInput.value = suggestion.title;
                        searchResultsContainer.style.display = 'none';
                        window.location.href = `/movie-details.html?id=${suggestion.id}`;
                    });
                    searchResultsContainer.appendChild(suggestionItem);
                });
            } else {
                const noResults = document.createElement('div');
                noResults.className = 'p-3 text-gray-400';
                noResults.textContent = 'No results found';
                searchResultsContainer.appendChild(noResults);
            }
        }, 300);
    } else {
        searchResultsContainer.style.display = 'none';
        initializePage();
    }
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        searchResultsContainer.style.display = 'none';
    }
});

// Initialize Page
async function initializePage() {
    const trendingMovies = await fetchTrendingMovies();
    const popularSeries = await fetchPopularSeries();
    
    trendingMoviesContainer.innerHTML = '';
    trendingMovies.forEach(movie => {
        trendingMoviesContainer.appendChild(createMovieCard(movie));
    });
    
    popularSeriesContainer.innerHTML = '';
    popularSeries.forEach(series => {
        popularSeriesContainer.appendChild(createMovieCard(series));
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', initializePage);