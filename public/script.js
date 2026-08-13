// ============================================================
//  TANZANIA STAYDIRECTORY - PREMIUM MODERN SCRIPT
//  Enhanced with new features
// ============================================================

// ==================== GLOBAL STATE ====================
let map;
let placesService;
let currentMarkers = [];
let currentResults = [];
let activeCurrency = 'USD';
let activeFilter = 'all';
let userMarker = null;
const USD_TO_TZS_RATE = 2600;
let favoritePlaces = JSON.parse(localStorage.getItem('tz_fav_stays')) || [];

// DOM References
let modal, modalBody, favsSidebar;
let placesList, resultsHeading, favCount, favsList, resultCount;

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== INITIALIZATION ====================
function initApp() {
    console.log('🚀 Initializing Tanzania StayDirectory Premium...');
    
    try {
        if (typeof google === 'undefined') {
            console.error('❌ Google Maps not loaded!');
            return;
        }
        
        // --- Get DOM references ---
        modal = document.getElementById('details-modal');
        modalBody = document.getElementById('modal-body');
        favsSidebar = document.getElementById('favorites-sidebar');
        placesList = document.getElementById('places-list');
        resultsHeading = document.getElementById('results-heading');
        resultCount = document.getElementById('result-count');
        favCount = document.getElementById('fav-count');
        favsList = document.getElementById('favs-list');
        
        const searchBtn = document.getElementById('search-btn');
        const keywordInput = document.getElementById('keyword-input');
        const locationSelect = document.getElementById('location-select');
        const typeSelect = document.getElementById('type-select');
        const currencySelect = document.getElementById('currency-select');
        const toggleFavsBtn = document.getElementById('toggle-favorites-btn');
        const closeFavsBtn = document.getElementById('close-favs');
        const myLocationBtn = document.getElementById('my-location-btn');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const resetViewBtn = document.getElementById('reset-view-btn');
        const priceFilter = document.getElementById('price-filter');

        // --- Default coordinates (Dar es Salaam) ---
        const defaultCoords = { lat: -6.7924, lng: 39.2083 };

        // --- Create map ---
        map = new google.maps.Map(document.getElementById('map-container'), {
            center: defaultCoords,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: getMapStyles(),
            zoomControl: false
        });
        
        console.log('✅ Map created successfully');

        // --- Initialize Places Service ---
        placesService = new google.maps.places.PlacesService(map);
        console.log('✅ Places service initialized');

        // --- Event Listeners ---
        searchBtn.addEventListener('click', function() {
            console.log('🔍 Search button clicked');
            runDirectorySearch();
        });
        
        keywordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('🔍 Enter key pressed');
                runDirectorySearch();
            }
        });

        currencySelect.addEventListener('change', function(e) {
            console.log('💰 Currency changed to:', e.target.value);
            activeCurrency = e.target.value;
            refreshDisplay();
        });
        
        priceFilter.addEventListener('change', function(e) {
            console.log('💰 Price filter changed:', e.target.value);
            applyPriceFilter(e.target.value);
        });
        
        // Favorites drawer
        toggleFavsBtn.addEventListener('click', function() {
            favsSidebar.classList.toggle('open');
        });
        
        closeFavsBtn.addEventListener('click', function() {
            favsSidebar.classList.remove('open');
        });
        
        // Modal close
        document.querySelector('.close-modal').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', function(e) {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Map controls
        myLocationBtn.addEventListener('click', getUserLocation);
        zoomInBtn.addEventListener('click', () => map.setZoom(map.getZoom() + 1));
        zoomOutBtn.addEventListener('click', () => map.setZoom(map.getZoom() - 1));
        resetViewBtn.addEventListener('click', () => {
            map.setCenter(defaultCoords);
            map.setZoom(13);
            showToast('View reset to Dar es Salaam', 'info');
        });

        // Quick filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                activeFilter = this.dataset.filter;
                applyQuickFilter(activeFilter);
            });
        });

        // --- Initial load ---
        updateFavoritesUI();
        
        setTimeout(function() {
            console.log('🔄 Running initial search...');
            runDirectorySearch();
        }, 1000);
        
        console.log('✅ App initialized successfully!');
        showToast('Welcome to Tanzania StayDirectory! 🏝️', 'success');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        if (placesList) {
            placesList.innerHTML = `<div class="loading-spinner"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p style="color:#dc2626;">⚠️ Error: ${error.message}</p></div>`;
        }
    }
}

// ==================== MAP STYLES ====================
function getMapStyles() {
    return [
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e3f2fd' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e8e4dc' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4e8c8' }] },
        { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] }
    ];
}

// ==================== SEARCH ====================
function runDirectorySearch() {
    console.log('🔍 Running directory search...');
    
    const locationSelect = document.getElementById('location-select');
    const typeSelect = document.getElementById('type-select');
    const keywordInput = document.getElementById('keyword-input');
    
    const targetCity = locationSelect.value;
    const propertyType = typeSelect.value;
    const keyword = keywordInput.value.trim();
    
    console.log('📍 Search params:', { targetCity, propertyType, keyword });
    
    const cityName = targetCity.split(',')[0];
    resultsHeading.innerText = `Stays in ${cityName}`;
    
    placesList.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Searching ${cityName}...</p></div>`;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: targetCity }, function(geoResults, status) {
        console.log('📍 Geocode status:', status);
        
        if (status === 'OK' && geoResults && geoResults.length > 0) {
            const location = geoResults[0].geometry.location;
            
            map.setCenter(location);
            map.setZoom(14);

            const request = {
                location: location,
                radius: 8000,
                type: [propertyType]
            };

            if (keyword !== '') {
                request.keyword = keyword;
            }

            console.log('📤 Sending Places request:', request);
            placesService.nearbySearch(request, processSearchResults);
        } else {
            console.error('❌ Geocoding failed:', status);
            placesList.innerHTML = `<div class="loading-spinner"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p style="color:#dc2626;">❌ Could not find "${targetCity}"</p></div>`;
            showToast('Could not find location', 'error');
        }
    });
}

// ==================== PROCESS RESULTS ====================
function processSearchResults(results, status) {
    console.log('📥 Places search status:', status);
    console.log('📊 Results count:', results ? results.length : 0);
    
    clearMapPins();

    if (status !== google.maps.places.PlacesServiceStatus.OK || !results || results.length === 0) {
        placesList.innerHTML = `<div class="loading-spinner"><i class="fas fa-search" style="color:#94a3b8;"></i><p>No properties found. Try adjusting your search.</p></div>`;
        resultCount.textContent = '0 properties';
        currentResults = [];
        return;
    }

    currentResults = results;

    results.forEach(function(place, index) {
        const seed = parseInt(place.place_id.replace(/\D/g, '')) || index;
        const mockPrice = (seed % 180) + 45;
        place._mockPrice = mockPrice;
        
        // Determine price category
        if (mockPrice < 80) place._priceCategory = 'budget';
        else if (mockPrice < 150) place._priceCategory = 'mid';
        else place._priceCategory = 'luxury';
    });

    // Apply current filter
    applyPriceFilter(document.getElementById('price-filter').value);
    
    resultCount.textContent = `${results.length} properties found`;
    showToast(`Found ${results.length} properties! 🎉`, 'success');
}

// ==================== RENDER CARD ====================
function renderPlaceCard(place, container) {
    const card = document.createElement('div');
    card.classList.add('place-card');
    card.dataset.priceCategory = place._priceCategory;

    // --- Image ---
    let imageUrl = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop';
    try {
        if (place.photos && place.photos.length > 0 && typeof place.photos[0].getUrl === 'function') {
            imageUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 });
        }
    } catch (e) {}

    // --- Rating ---
    const ratingDisplay = place.rating ? `${place.rating.toFixed(1)}` : 'No reviews';

    // --- Open status ---
    let statusHTML = '<span class="status-badge status-unknown">Status unknown</span>';
    try {
        if (place.opening_hours && typeof place.opening_hours.isOpen === 'function') {
            const isOpen = place.opening_hours.isOpen();
            statusHTML = isOpen 
                ? '<span class="status-badge status-open">● Open Now</span>'
                : '<span class="status-badge status-closed">● Closed</span>';
        }
    } catch (e) {}

    // --- Price ---
    const priceHTML = formatPrice(place._mockPrice);

    // --- Favorite state ---
    const isSaved = favoritePlaces.some(function(fav) {
        return fav.place_id === place.place_id;
    });
    const heartActive = isSaved ? 'active' : '';

    // --- Type badge ---
    const typeBadge = place.types ? place.types[0] || 'lodging' : 'lodging';
    const typeIcons = {
        hotel: '🏩',
        lodging: '🏕️',
        campground: '⛺',
        resort: '🏝️',
        bed_and_breakfast: '🍳'
    };
    const typeIcon = typeIcons[typeBadge] || '🏨';

    card.innerHTML = `
        <div class="place-card-image">
            <img src="${imageUrl}" alt="${place.name}" loading="lazy" />
            <span class="place-card-badge">${typeIcon} ${typeBadge.replace('_', ' ').toUpperCase()}</span>
            <button class="heart-btn ${heartActive}" data-place-id="${place.place_id}">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="place-card-details">
            <div class="place-name">${place.name}</div>
            <div class="place-address"><i class="fas fa-map-pin" style="color:#94a3b8;font-size:12px;"></i> ${place.vicinity || 'Tanzania'}</div>
            <div class="place-meta">
                <span class="place-rating"><i class="fas fa-star"></i> ${ratingDisplay}</span>
                <span class="place-price">${priceHTML}</span>
            </div>
            <div class="place-status">${statusHTML}</div>
        </div>
    `;

    // --- Heart button ---
    const heartBtn = card.querySelector('.heart-btn');
    heartBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFavorite(place);
    });

    // --- Card click -> detail modal ---
    card.addEventListener('click', function() {
        fetchPlaceDetails(place.place_id);
    });

    container.appendChild(card);
}

// ==================== PRICE FILTER ====================
function applyPriceFilter(filter) {
    const cards = placesList.querySelectorAll('.place-card');
    const priceFilter = document.getElementById('price-filter');
    
    if (filter === 'all') {
        cards.forEach(card => card.style.display = 'block');
        resultCount.textContent = `${cards.length} properties`;
        return;
    }
    
    let visible = 0;
    cards.forEach(card => {
        const category = card.dataset.priceCategory;
        if (category === filter) {
            card.style.display = 'block';
            visible++;
        } else {
            card.style.display = 'none';
        }
    });
    
    resultCount.textContent = `${visible} properties (filtered)`;
}

// ==================== QUICK FILTER ====================
function applyQuickFilter(filter) {
    const cards = placesList.querySelectorAll('.place-card');
    
    if (filter === 'all') {
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    cards.forEach(card => {
        const typeBadge = card.querySelector('.place-card-badge');
        if (typeBadge && typeBadge.textContent.toLowerCase().includes(filter)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==================== PRICE FORMATTING ====================
function formatPrice(usdAmount) {
    if (activeCurrency === 'TZS') {
        const tzs = usdAmount * USD_TO_TZS_RATE;
        return `${tzs.toLocaleString()} TZS <small>/nt</small>`;
    }
    return `$${usdAmount} <small>/night</small>`;
}

// ==================== REFRESH DISPLAY ====================
function refreshDisplay() {
    console.log('🔄 Refreshing display with currency:', activeCurrency);
    
    if (currentResults.length > 0) {
        placesList.innerHTML = '';
        currentResults.forEach(function(place) {
            renderPlaceCard(place, placesList);
        });
        // Re-apply filters
        applyPriceFilter(document.getElementById('price-filter').value);
        applyQuickFilter(activeFilter);
    }
    
    updateFavoritesUI();
}

// ==================== FAVORITES ====================
function toggleFavorite(place) {
    console.log('❤️ Toggling favorite:', place.name);
    
    const index = favoritePlaces.findIndex(function(fav) {
        return fav.place_id === place.place_id;
    });

    if (index > -1) {
        favoritePlaces.splice(index, 1);
        showToast(`${place.name} removed from favorites`, 'error');
    } else {
        let imgUrl = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop';
        try {
            if (place.photos && place.photos.length > 0 && typeof place.photos[0].getUrl === 'function') {
                imgUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 });
            }
        } catch (e) {}
        
        favoritePlaces.push({
            place_id: place.place_id,
            name: place.name,
            vicinity: place.vicinity || 'Tanzania',
            rating: place.rating || null,
            _mockPrice: place._mockPrice || 89,
            _imageUrl: imgUrl,
            _priceCategory: place._priceCategory || 'mid'
        });
        showToast(`${place.name} saved! ❤️`, 'success');
    }

    localStorage.setItem('tz_fav_stays', JSON.stringify(favoritePlaces));
    updateFavoritesUI();

    if (currentResults.length > 0) {
        const scrollPos = document.querySelector('.sidebar').scrollTop;
        placesList.innerHTML = '';
        currentResults.forEach(function(p) {
            renderPlaceCard(p, placesList);
        });
        applyPriceFilter(document.getElementById('price-filter').value);
        applyQuickFilter(activeFilter);
        document.querySelector('.sidebar').scrollTop = scrollPos;
    }
}

// ==================== UPDATE FAVORITES UI ====================
function updateFavoritesUI() {
    if (!favCount || !favsList) return;
    
    favCount.innerText = favoritePlaces.length;
    favsList.innerHTML = '';

    if (favoritePlaces.length === 0) {
        favsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>No saved properties yet</p>
                <span>Heart your favorite stays to save them here</span>
            </div>
        `;
        return;
    }

    favoritePlaces.forEach(function(place) {
        const card = document.createElement('div');
        card.classList.add('place-card');
        
        const imgUrl = place._imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop';
        const ratingDisplay = place.rating ? `⭐ ${place.rating.toFixed(1)}` : '⭐ No reviews';
        const priceHTML = formatPrice(place._mockPrice || 89);

        card.innerHTML = `
            <div class="place-card-image" style="height:140px;">
                <img src="${imgUrl}" alt="${place.name}" style="height:100%;" loading="lazy" />
            </div>
            <div class="place-card-details">
                <div class="place-name">${place.name}</div>
                <div class="place-address"><i class="fas fa-map-pin" style="color:#94a3b8;font-size:12px;"></i> ${place.vicinity || 'Tanzania'}</div>
                <div class="place-meta">
                    <span class="place-rating">${ratingDisplay}</span>
                    <span class="place-price">${priceHTML}</span>
                </div>
                <button class="btn-primary" style="margin-top:8px; width:100%; background:#dc2626;" data-place-id="${place.place_id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;

        card.querySelector('.btn-primary').addEventListener('click', function(e) {
            e.stopPropagation();
            const id = e.target.closest('button').dataset.placeId;
            const found = favoritePlaces.find(function(p) {
                return p.place_id === id;
            });
            if (found) toggleFavorite(found);
        });

        card.addEventListener('click', function() {
            fetchPlaceDetails(place.place_id);
        });

        favsList.appendChild(card);
    });
}

// ==================== PLACE DETAILS (MODAL) ====================
function fetchPlaceDetails(placeId) {
    console.log('📋 Fetching details for:', placeId);
    
    const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'photos', 'rating', 'reviews', 'website', 'url', 'price_level']
    };

    placesService.getDetails(request, function(place, status) {
        console.log('📋 Details status:', status);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            let heroImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop';
            try {
                if (place.photos && place.photos.length > 0 && typeof place.photos[0].getUrl === 'function') {
                    heroImage = place.photos[0].getUrl({ maxWidth: 600, maxHeight: 400 });
                }
            } catch (e) {}

            const phone = place.formatted_phone_number 
                ? `📞 ${place.formatted_phone_number}` 
                : '📞 Phone not listed';
            
            const rating = place.rating 
                ? `${place.rating.toFixed(1)} / 5` 
                : 'Not available';

            const priceMap = { 0: 'Free', 1: '💰 Inexpensive', 2: '💰💰 Moderate', 3: '💰💰💰 Expensive', 4: '💰💰💰💰 Very Expensive' };
            const priceLevel = place.price_level !== undefined ? priceMap[place.price_level] || 'N/A' : 'N/A';

            const bookingHTML = place.website
                ? `<a href="${place.website}" target="_blank" class="btn-block-action"><i class="fas fa-external-link-alt"></i> Book Now (Official Website)</a>`
                : `<button class="btn-block-action" style="background:#94a3b8; cursor:default;"><i class="fas fa-ban"></i> No website available</button>`;

            let galleryHTML = '';
            try {
                if (place.photos && place.photos.length > 1) {
                    galleryHTML = `<div class="photo-strip">`;
                    place.photos.slice(1, 5).forEach(function(pic) {
                        galleryHTML += `<img src="${pic.getUrl({ maxWidth: 150, maxHeight: 150 })}" class="strip-img" alt="Gallery" />`;
                    });
                    galleryHTML += `</div>`;
                }
            } catch (e) {}

            let reviewsHTML = `<div style="margin-top:16px;"><h3 style="font-size:16px; font-weight:700; margin-bottom:12px;">📝 Guest Reviews</h3>`;
            if (place.reviews && place.reviews.length > 0) {
                place.reviews.slice(0, 4).forEach(function(rev) {
                    reviewsHTML += `
                        <div class="review-item">
                            <div class="review-author"><i class="fas fa-user-circle"></i> ${rev.author_name} (${rev.rating}⭐)</div>
                            <div class="review-text">"${rev.text}"</div>
                        </div>
                    `;
                });
            } else {
                reviewsHTML += `<p style="color:#94a3b8; font-style:italic;">No guest reviews yet.</p>`;
            }
            reviewsHTML += `</div>`;

            modalBody.innerHTML = `
                <img src="${heroImage}" class="modal-hero-img" alt="${place.name}" />
                <h2 class="modal-title">${place.name}</h2>
                <div class="modal-rating"><i class="fas fa-star"></i> ${rating}</div>
                <div style="font-size:14px; color:var(--text-secondary); margin-bottom:6px;">${priceLevel}</div>
                <div class="modal-phone">${phone}</div>
                <p class="modal-address"><i class="fas fa-location-dot"></i> ${place.formatted_address || 'Address not available'}</p>
                
                ${bookingHTML}
                
                <hr style="border:0; border-top:1px solid var(--border-color); margin:16px 0;" />
                <h3 style="font-size:16px; font-weight:700; margin-bottom:8px;">📸 Gallery</h3>
                ${galleryHTML || '<p style="color:#94a3b8; font-size:14px;">No additional photos available.</p>'}
                
                ${reviewsHTML}
            `;

            modal.style.display = 'flex';
        } else {
            console.error('❌ Failed to fetch details:', status);
            showToast('Could not load property details', 'error');
        }
    });
}

// ==================== MAP MARKERS ====================
function dropMarker(place) {
    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        title: place.name,
        animation: google.maps.Animation.DROP,
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32)
        }
    });

    marker.addListener('click', function() {
        fetchPlaceDetails(place.place_id);
    });
    currentMarkers.push(marker);
}

function clearMapPins() {
    currentMarkers.forEach(function(marker) {
        marker.setMap(null);
    });
    currentMarkers = [];
    if (userMarker) {
        userMarker.setMap(null);
        userMarker = null;
    }
}

// ==================== GEOLOCATION ====================
function getUserLocation() {
    if (navigator.geolocation) {
        showToast('Getting your location...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                const coords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                
                map.setCenter(coords);
                map.setZoom(15);
                
                // Remove old user marker
                if (userMarker) {
                    userMarker.setMap(null);
                }
                
                userMarker = new google.maps.Marker({
                    map: map,
                    position: coords,
                    title: 'You are here',
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        scaledSize: new google.maps.Size(36, 36)
                    }
                });
                
                // Search near user
                const request = {
                    location: coords,
                    radius: 3000,
                    type: ['lodging']
                };
                
                placesService.nearbySearch(request, function(results, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                        processSearchResults(results, status);
                        showToast(`Found ${results.length} properties near you! 🎉`, 'success');
                    } else {
                        showToast('No properties found near you.', 'info');
                    }
                });
            },
            function() {
                showToast('Location access denied. Using default location.', 'error');
            }
        );
    } else {
        showToast('Geolocation not supported by your browser.', 'error');
    }
}

// ==================== EXPOSE GLOBALLY ====================
window.initApp = initApp;

console.log('📦 Tanzania StayDirectory Premium loaded successfully!');