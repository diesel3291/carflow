// DOM Elements
const loader = document.getElementById('loader');
const mainContent = document.getElementById('mainContent');
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');
const backgroundMusic = document.getElementById('backgroundMusic');
const timelineLinks = document.querySelectorAll('.timeline-link');
const contentLayers = document.querySelectorAll('.content-layer');
const textLayers = document.querySelectorAll('.text-layer');
const scrollIndicator = document.querySelector('.scroll-indicator');

// State
let currentIndex = 0;
let scrollProgress = 0;
let isScrolling = false;
let isMuted = false;
let touchStartY = 0;
let lastWheelTime = 0;
let accumulatedDelta = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Start button click handler
    startBtn.addEventListener('click', startExperience);
    
    // Timeline navigation
    timelineLinks.forEach(link => {
        link.addEventListener('click', handleTimelineClick);
    });
    
    // Sound toggle
    soundToggle.addEventListener('click', toggleSound);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyNavigation);
    
    // Mouse wheel navigation with gradual scroll
    document.addEventListener('wheel', handleWheelNavigation, { passive: false });
    
    // Touch navigation for mobile
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
});

// Start Experience
function startExperience() {
    // Fade out loader
    loader.style.opacity = '0';
    
    // Show main content after fade
    setTimeout(() => {
        loader.style.display = 'none';
        mainContent.classList.remove('hidden');
        
        // Try to play background music
        if (backgroundMusic) {
            backgroundMusic.volume = 0.3;
            backgroundMusic.play().catch(err => {
                console.log('Audio autoplay prevented:', err);
            });
        }
        
        // Initialize first layer
        updateLayers(0);
    }, 500);
}

// Timeline Navigation
function handleTimelineClick(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.target.dataset.section);
    if (targetIndex !== currentIndex) {
        currentIndex = targetIndex;
        scrollProgress = 0;
        updateLayers(0);
        updateTimeline();
        updateScrollIndicator();
    }
}

// Gradual scroll handling
function handleWheelNavigation(e) {
    e.preventDefault();
    
    const now = Date.now();
    const timeDiff = now - lastWheelTime;
    
    // Reset accumulated delta if too much time has passed
    if (timeDiff > 200) {
        accumulatedDelta = 0;
    }
    
    // Accumulate scroll delta
    accumulatedDelta += e.deltaY;
    lastWheelTime = now;
    
    // Calculate scroll amount
    const scrollAmount = accumulatedDelta / 1000; // Adjust divisor for sensitivity
    
    // Handle scroll direction
    if (e.deltaY > 0) {
        // Scrolling down - wipe current layer up
        scrollProgress = Math.max(0, Math.min(1, scrollProgress + scrollAmount * 0.5));
        
        // Update the wipe animation
        updateLayers(scrollProgress);
        
        // Check if we should move to next layer
        if (scrollProgress >= 1 && currentIndex < contentLayers.length - 1) {
            currentIndex++;
            scrollProgress = 0;
            accumulatedDelta = 0;
            updateTimeline();
            updateScrollIndicator();
        }
    } else {
        // Scrolling up - reveal previous layer
        if (currentIndex > 0) {
            if (scrollProgress > 0) {
                // Continue revealing current layer
                scrollProgress = Math.max(0, Math.min(1, scrollProgress + scrollAmount * 0.5));
            } else {
                // Start revealing previous layer
                currentIndex--;
                scrollProgress = 1 + scrollAmount * 0.5; // Start from fully hidden
                updateTimeline();
                updateScrollIndicator();
            }
            updateLayers(scrollProgress);
            
            // Reset when fully revealed
            if (scrollProgress <= 0) {
                scrollProgress = 0;
                accumulatedDelta = 0;
            }
        }
    }
}

// Touch handling
let initialScrollProgress = 0;

function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    initialScrollProgress = scrollProgress;
}

function handleTouchMove(e) {
    e.preventDefault();
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;
    
    // Calculate scroll amount based on touch movement
    const scrollAmount = diff / 300; // Adjust divisor for sensitivity
    
    if (diff > 0) {
        // Swiping up - move forward
        scrollProgress = Math.max(0, Math.min(1, initialScrollProgress + scrollAmount));
        updateLayers(scrollProgress);
    } else {
        // Swiping down - move backward
        if (currentIndex > 0) {
            if (initialScrollProgress > 0) {
                // Continue revealing current layer
                scrollProgress = Math.max(0, initialScrollProgress + scrollAmount);
            } else {
                // Start revealing previous layer
                currentIndex--;
                scrollProgress = 1 + scrollAmount; // Start from fully hidden
                updateTimeline();
                updateScrollIndicator();
            }
            updateLayers(scrollProgress);
        }
    }
}

function handleTouchEnd(e) {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    
    // Determine if we should complete the transition
    if (Math.abs(diff) > 50) {
        if (diff > 0 && scrollProgress > 0.5 && currentIndex < contentLayers.length - 1) {
            // Complete transition to next
            if (scrollProgress < 1) {
                animateToProgress(1, () => {
                    currentIndex++;
                    scrollProgress = 0;
                    updateLayers(0);
                    updateTimeline();
                    updateScrollIndicator();
                });
            }
        } else if (diff < 0 && currentIndex >= 0) {
            // Complete transition to previous
            if (scrollProgress < 0.5) {
                animateToProgress(0);
            } else {
                // Snap back to current
                animateToProgress(1, () => {
                    if (currentIndex < contentLayers.length - 1) {
                        currentIndex++;
                        scrollProgress = 0;
                        updateLayers(0);
                        updateTimeline();
                        updateScrollIndicator();
                    }
                });
            }
        } else {
            // Snap to nearest state
            if (scrollProgress > 0.5) {
                animateToProgress(1, () => {
                    if (currentIndex < contentLayers.length - 1) {
                        currentIndex++;
                        scrollProgress = 0;
                        updateLayers(0);
                        updateTimeline();
                        updateScrollIndicator();
                    }
                });
            } else {
                animateToProgress(0);
            }
        }
    } else {
        // Snap back if not enough movement
        animateToProgress(initialScrollProgress);
    }
}

// Animate to a specific progress value
function animateToProgress(targetProgress, callback) {
    const startProgress = scrollProgress;
    const diff = targetProgress - startProgress;
    const duration = 300;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        scrollProgress = startProgress + diff * easeProgress;
        updateLayers(scrollProgress);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            scrollProgress = targetProgress;
            if (callback) callback();
        }
    }
    
    animate();
}

// Update layer positions based on scroll progress
function updateLayers(progress) {
    // Update content layers
    contentLayers.forEach((layer, index) => {
        layer.classList.remove('active', 'prev');
        
        if (index === currentIndex) {
            // Current layer - apply wipe based on progress
            const clipValue = 100 - (progress * 100);
            layer.style.clipPath = `polygon(0 0, 100% 0, 100% ${clipValue}%, 0 ${clipValue}%)`;
            layer.style.transition = 'none';
            layer.classList.add('active');
        } else if (index < currentIndex) {
            // Previous layers - fully wiped
            layer.style.clipPath = 'polygon(0 0, 100% 0, 100% 0%, 0 0%)';
            layer.style.transition = 'none';
            layer.classList.add('prev');
        } else {
            // Future layers - fully visible but underneath
            layer.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
            layer.style.transition = 'none';
        }
    });
    
    // Update text layers with the same animation
    textLayers.forEach((layer, index) => {
        layer.classList.remove('active', 'prev');
        
        if (index === currentIndex) {
            // Current text layer - apply same wipe as content
            const clipValue = 100 - (progress * 100);
            layer.style.clipPath = `polygon(0 0, 100% 0, 100% ${clipValue}%, 0 ${clipValue}%)`;
            layer.style.transition = 'none';
            layer.classList.add('active');
        } else if (index < currentIndex) {
            // Previous text layers - fully wiped
            layer.style.clipPath = 'polygon(0 0, 100% 0, 100% 0%, 0 0%)';
            layer.style.transition = 'none';
            layer.classList.add('prev');
        } else {
            // Future text layers - fully visible but underneath
            layer.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
            layer.style.transition = 'none';
        }
    });
}

// Update timeline active state
function updateTimeline() {
    timelineLinks.forEach((link, index) => {
        link.classList.toggle('active', index === currentIndex);
    });
}

// Update scroll indicator visibility
function updateScrollIndicator() {
    if (currentIndex === contentLayers.length - 1) {
        scrollIndicator.classList.add('hidden');
    } else {
        scrollIndicator.classList.remove('hidden');
    }
}

// Keyboard Navigation
function handleKeyNavigation(e) {
    switch(e.key) {
        case 'ArrowDown':
        case 'PageDown':
            e.preventDefault();
            if (currentIndex < contentLayers.length - 1) {
                currentIndex++;
                animateToProgress(1, () => {
                    scrollProgress = 0;
                    updateLayers(0);
                    updateTimeline();
                    updateScrollIndicator();
                });
            }
            break;
        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            if (currentIndex > 0) {
                currentIndex--;
                scrollProgress = 1;
                updateLayers(1);
                setTimeout(() => {
                    animateToProgress(0);
                    updateTimeline();
                    updateScrollIndicator();
                }, 50);
            }
            break;
        case 'Home':
            e.preventDefault();
            currentIndex = 0;
            scrollProgress = 0;
            updateLayers(0);
            updateTimeline();
            updateScrollIndicator();
            break;
        case 'End':
            e.preventDefault();
            currentIndex = contentLayers.length - 1;
            scrollProgress = 0;
            updateLayers(0);
            updateTimeline();
            updateScrollIndicator();
            break;
    }
}

// Sound Toggle
function toggleSound() {
    isMuted = !isMuted;
    
    if (backgroundMusic) {
        if (isMuted) {
            backgroundMusic.pause();
            soundToggle.classList.add('muted');
            soundToggle.querySelector('.sound-icon').textContent = '🔇';
        } else {
            backgroundMusic.play().catch(err => {
                console.log('Audio play prevented:', err);
            });
            soundToggle.classList.remove('muted');
            soundToggle.querySelector('.sound-icon').textContent = '🔊';
        }
    }
}

// Initialize on load
window.addEventListener('load', () => {
    console.log('BMW M Evolution site loaded');
});
