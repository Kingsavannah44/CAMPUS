const API_BASE = 'http://localhost:5000/api';

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

const app = document.getElementById('app');
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const dashboardSection = document.getElementById('dashboard-section');
const electionDetailSection = document.getElementById('elections-section');
const candidatesSection = document.getElementById('candidates-section');
const resultsSection = document.getElementById('results-section');
const adminSection = document.getElementById('admin-section');
const homeSection = document.getElementById('home-section');

let authToken = localStorage.getItem('token') || null;
let currentUser = null;
let currentElection = null;

// Start voting function
function startVoting() {
    showSection(dashboardSection);
}

// Show/hide sections
function showSection(section) {
    [homeSection, loginSection, registerSection, dashboardSection, electionDetailSection, candidatesSection, resultsSection, adminSection].forEach(s => {
        s.classList.remove('active');
    });
    section.classList.add('active');
    
    const navbar = document.getElementById('navbar');
    if (section === homeSection) {
        navbar.style.display = 'block';
    } else {
        navbar.style.display = 'none';
    }
}

// Fetch wrapper with auth
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    return data;
}

// Login
async function login(email, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        authToken = data.data.token;
        localStorage.setItem('token', authToken);
        currentUser = data.data.user;
        showSection(homeSection);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

// Register
async function register(name, email, password, role, institutionName = null) {
    try {
        const registerData = { name, email, password, role };
        if (role === 'voter' && institutionName) {
            registerData.institution = institutionName.trim();
        }
        
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(registerData)
        });
        authToken = data.data.token;
        localStorage.setItem('token', authToken);
        currentUser = data.data.user;
        showSection(homeSection);
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

// Load content based on user role
async function loadUserContent() {
    if (currentUser && currentUser.role === 'admin') {
        loadElections();
    } else {
        loadVoterElection();
    }
}

// Load elections
async function loadElections() {
    try {
        const data = await apiRequest('/elections');
        renderElections(data.data || []);
    } catch (error) {
        renderElections([]);
    }
}

// Load voter election
async function loadVoterElection() {
    try {
        const data = await apiRequest('/elections');
        renderElections(data.data || []);
    } catch (error) {
        const demoElections = [{
            _id: 'demo-1',
            name: 'Student Government Elections 2024',
            description: 'Annual student government elections',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }];
        renderElections(demoElections);
    }
}

// Render elections
function renderElections(elections) {
    const electionsList = document.getElementById('elections-list');
    if (!electionsList) return;
    
    electionsList.innerHTML = '';
    elections.forEach(election => {
        const div = document.createElement('div');
        div.className = 'election-item';
        div.innerHTML = `
            <h3>${election.name}</h3>
            <p>${election.description || 'No description'}</p>
            <p>Start: ${new Date(election.startDate).toLocaleDateString()}</p>
            <p>End: ${new Date(election.endDate).toLocaleDateString()}</p>
            <button onclick="showCandidatesAndVote('${election._id}')">View Candidates & Vote</button>
        `;
        electionsList.appendChild(div);
    });
}

// Show candidates and voting
async function showCandidatesAndVote(electionId) {
    try {
        const candidatesData = await apiRequest(`/candidates/election/${electionId}`);
        const candidates = candidatesData.data || candidatesData || [];
        
        const positionsContainer = document.getElementById('positions-list');
        if (!positionsContainer) return;
        
        positionsContainer.innerHTML = '';
        
        if (candidates.length === 0) {
            positionsContainer.innerHTML = '<p>No candidates found for this election.</p>';
            showSection(electionDetailSection);
            return;
        }
        
        const positions = {};
        candidates.forEach(candidate => {
            const posName = candidate.position || 'Unknown Position';
            if (!positions[posName]) {
                positions[posName] = [];
            }
            positions[posName].push(candidate);
        });
        
        Object.keys(positions).forEach(position => {
            const div = document.createElement('div');
            div.className = 'position-item';
            div.innerHTML = `<h3>${position}</h3>`;
            
            positions[position].forEach(candidate => {
                const candDiv = document.createElement('div');
                candDiv.className = 'candidate-item';
                candDiv.innerHTML = `
                    <p><strong>${sanitizeHTML(candidate.name)}</strong></p>
                    <p><em>${sanitizeHTML(candidate.manifesto || 'No manifesto')}</em></p>
                    ${candidate.photo ? `<img src="http://localhost:5000/uploads/${sanitizeHTML(candidate.photo)}" alt="${sanitizeHTML(candidate.name)}" width="100" style="border-radius: 50%; margin: 10px 0;">` : ''}
                    <button data-candidate="${sanitizeHTML(candidate.name)}" data-position="${sanitizeHTML(position)}" class="vote-btn">Vote for ${sanitizeHTML(candidate.name)}</button>
                `;
                
                // Add secure event listener
                const voteBtn = candDiv.querySelector('.vote-btn');
                voteBtn.addEventListener('click', () => {
                    castVote(voteBtn.dataset.candidate, voteBtn.dataset.position);
                });
                div.appendChild(candDiv);
            });
            positionsContainer.appendChild(div);
        });
        
        showSection(electionDetailSection);
    } catch (error) {
        console.error('Failed to load candidates:', error);
        const positionsContainer = document.getElementById('positions-list');
        if (positionsContainer) {
            positionsContainer.innerHTML = '<p>Failed to load candidates.</p>';
        }
        showSection(electionDetailSection);
    }
}

// Cast vote with validation
async function castVote(candidateName, position) {
    try {
        const response = await apiRequest('/votes', {
            method: 'POST',
            body: JSON.stringify({
                candidateName: candidateName,
                position: position,
                electionId: currentElection?._id
            })
        });
        alert(`Vote cast successfully for ${sanitizeHTML(candidateName)} (${sanitizeHTML(position)})!`);
    } catch (error) {
        alert('Failed to cast vote: ' + error.message);
    }
}

// Load all candidates
async function loadAllCandidates() {
    try {
        const data = await apiRequest('/candidates');
        const candidates = data.data || data || [];
        renderCandidatesList(candidates);
    } catch (error) {
        console.error('Failed to load candidates:', error);
        const candidatesList = document.getElementById('candidates-list');
        if (candidatesList) {
            candidatesList.innerHTML = '<p>Failed to load candidates.</p>';
        }
    }
}

// Render candidates list
function renderCandidatesList(candidates) {
    const candidatesList = document.getElementById('candidates-list');
    if (!candidatesList) return;
    
    candidatesList.innerHTML = '';
    
    if (candidates.length === 0) {
        candidatesList.innerHTML = '<p>No candidates found.</p>';
        return;
    }
    
    candidates.forEach(candidate => {
        const div = document.createElement('div');
        div.className = 'candidate-item';
        div.innerHTML = `
            <div class="candidate-info">
                <div class="candidate-name">${sanitizeHTML(candidate.name)}</div>
                <p class="candidate-manifesto">${sanitizeHTML(candidate.manifesto || 'No manifesto')}</p>
                <p><strong>Position:</strong> ${sanitizeHTML(candidate.position || 'Unknown')}</p>
                ${candidate.photo ? `<img src="http://localhost:5000/uploads/${sanitizeHTML(candidate.photo)}" alt="${sanitizeHTML(candidate.name)}" class="candidate-photo">` : '<div class="no-photo">No Photo</div>'}
            </div>
        `;
        candidatesList.appendChild(div);
    });
}

// Load all results
async function loadAllResults() {
    try {
        const elections = await apiRequest('/elections');
        const resultsList = document.getElementById('results-list');
        if (!resultsList) return;
        
        resultsList.innerHTML = '<p>Loading results...</p>';
        
        let allResults = [];
        for (const election of elections.data || []) {
            try {
                const results = await apiRequest(`/votes/results/${election._id}`);
                if (results.data && results.data.length > 0) {
                    allResults.push({
                        electionName: election.name,
                        results: results.data
                    });
                }
            } catch (e) {
                console.log(`No results for election ${election.name}`);
            }
        }
        
        renderResults(allResults);
    } catch (error) {
        console.error('Failed to load results:', error);
        const resultsList = document.getElementById('results-list');
        if (resultsList) {
            resultsList.innerHTML = '<p>Failed to load results.</p>';
        }
    }
}

// Render results
function renderResults(allResults) {
    const resultsList = document.getElementById('results-list');
    if (!resultsList) return;
    
    resultsList.innerHTML = '';
    
    if (allResults.length === 0) {
        resultsList.innerHTML = '<p>No results available yet.</p>';
        return;
    }
    
    allResults.forEach(electionResult => {
        const electionDiv = document.createElement('div');
        electionDiv.className = 'election-results';
        electionDiv.innerHTML = `<h3>${sanitizeHTML(electionResult.electionName)}</h3>`;
        
        electionResult.results.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'result-item';
            resultDiv.innerHTML = `
                <p><strong>${sanitizeHTML(result.candidateName)}</strong></p>
                <p>Position: ${sanitizeHTML(result.positionName || 'Unknown')}</p>
                <p>Votes: ${sanitizeHTML(result.votes.toString())}</p>
            `;
            electionDiv.appendChild(resultDiv);
        });
        
        resultsList.appendChild(electionDiv);
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            login(email, password);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const role = document.getElementById('register-role').value;
            const institutionName = document.getElementById('register-election').value;
            
            if (role === 'voter' && !institutionName.trim()) {
                alert('Please enter your institution name.');
                return;
            }
            
            register(name, email, password, role, institutionName);
        });
    }
    
    // Navigation
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const backToDashboardBtn = document.getElementById('back-to-dashboard');
    const navElections = document.getElementById('nav-elections');
    
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(registerSection);
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(loginSection);
        });
    }
    
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => showSection(dashboardSection));
    }
    
    if (navElections) {
        navElections.addEventListener('click', () => {
            showSection(electionDetailSection);
            loadUserContent();
        });
    }
    
    // Candidates button
    const navCandidates = document.getElementById('nav-candidates');
    if (navCandidates) {
        navCandidates.addEventListener('click', () => {
            showSection(candidatesSection);
            loadAllCandidates();
        });
    }
    
    // Results button
    const navResults = document.getElementById('nav-results');
    if (navResults) {
        navResults.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                showSection(resultsSection);
                loadAllResults();
            } else {
                alert('Results are only available to administrators.');
            }
        });
    }
    
    // Contact form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name').value;
            alert(`Thank you ${name}! Your message has been received.`);
            contactForm.reset();
        });
    }
    
    // Initialize - require registration first
    if (authToken) {
        showSection(homeSection);
    } else {
        showSection(registerSection);
    }
});