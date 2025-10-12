const API_BASE = 'https://campus-backend-production.up.railway.app/api';
const DEMO_MODE = true; // Set to false when backend is deployed

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
let demoCandidates = JSON.parse(localStorage.getItem('demoCandidates')) || [
    { _id: '1', name: 'Alice Johnson', position: 'President', manifesto: 'Leading with integrity and innovation for student success' },
    { _id: '2', name: 'Bob Smith', position: 'President', manifesto: 'Building bridges between students and administration' },
    { _id: '3', name: 'Carol Davis', position: 'Vice President', manifesto: 'Empowering student voices in campus decisions' },
    { _id: '4', name: 'David Wilson', position: 'Secretary', manifesto: 'Transparent communication and efficient organization' }
];

// Start voting function
function startVoting() {
    // Check if user is authenticated
    if (!authToken || !currentUser) {
        // Show login section if not authenticated
        showSection(loginSection);
        return;
    }
    
    showSection(dashboardSection);
    setupDashboard();
}

// Setup dashboard based on user role
function setupDashboard() {
    const navAdmin = document.getElementById('nav-admin');
    const addCandidateBtn = document.getElementById('add-candidate-btn');
    
    if (currentUser && currentUser.role === 'admin') {
        if (navAdmin) navAdmin.style.display = 'block';
        if (addCandidateBtn) addCandidateBtn.style.display = 'block';
    } else {
        if (navAdmin) navAdmin.style.display = 'none';
        if (addCandidateBtn) addCandidateBtn.style.display = 'none';
    }
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
    if (DEMO_MODE) {
        // Demo mode responses
        if (url.includes('/auth/register') || url.includes('/auth/login')) {
            return { data: { token: 'demo-token', user: { name: 'Demo User', role: 'admin' } } };
        }
        if (url.includes('/elections')) {
            return { data: [{ _id: '1', name: 'Student Elections 2024', description: 'Demo election' }] };
        }
        if (url.includes('/candidates') && options.method === 'POST') {
            const candidateData = JSON.parse(options.body);
            const newCandidate = {
                _id: Date.now().toString(),
                ...candidateData
            };
            demoCandidates.push(newCandidate);
            localStorage.setItem('demoCandidates', JSON.stringify(demoCandidates));
            return { data: newCandidate };
        }
        if (url.includes('/candidates')) {
            return { data: demoCandidates };
        }
        if (url.includes('/votes/results')) {
            return { data: [
                { candidateName: 'Alice Johnson', positionName: 'President', votes: Math.floor(Math.random() * 100) + 50 },
                { candidateName: 'Bob Smith', positionName: 'President', votes: Math.floor(Math.random() * 80) + 30 },
                { candidateName: 'Carol Davis', positionName: 'Vice President', votes: Math.floor(Math.random() * 90) + 40 },
                { candidateName: 'David Wilson', positionName: 'Secretary', votes: Math.floor(Math.random() * 70) + 35 }
            ] };
        }
        if (url.includes('/votes') && options.method === 'POST') {
            return { data: { message: 'Vote cast successfully' } };
        }
        return { data: [] };
    }
    
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
        showSection(dashboardSection);
        setupDashboard();
        loadUserContent();
    } catch (error) {
        // Demo mode fallback
        if (DEMO_MODE) {
            alert('Demo Mode: Login successful!');
            authToken = 'demo-token';
            localStorage.setItem('token', authToken);
            currentUser = { name: 'Demo User', email, role: 'voter' };
            showSection(dashboardSection);
            setupDashboard();
            loadUserContent();
        } else {
            alert('Login failed: ' + error.message);
        }
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
        showSection(dashboardSection);
        setupDashboard();
        loadUserContent();
    } catch (error) {
        // Demo mode fallback
        alert('Demo Mode: Registration simulated successfully!');
        authToken = 'demo-token';
        localStorage.setItem('token', authToken);
        currentUser = { name, email, role };
        showSection(dashboardSection);
        setupDashboard();
        loadUserContent();
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
        // Set current election for vote tracking
        currentElection = { _id: electionId };
        
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
                    ${candidate.photo ? `<img src="${candidate.photo.startsWith('data:') ? candidate.photo : 'http://localhost:5000/uploads/' + sanitizeHTML(candidate.photo)}" alt="${sanitizeHTML(candidate.name)}" width="100" style="border-radius: 50%; margin: 10px 0;">` : ''}
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
        // Get current election ID from the active election
        const electionId = currentElection?._id || 'demo-1';
        
        const response = await apiRequest('/votes', {
            method: 'POST',
            body: JSON.stringify({
                candidateName: candidateName,
                position: position,
                electionId: electionId
            })
        });
        alert(`Vote cast successfully for ${sanitizeHTML(candidateName)} (${sanitizeHTML(position)})!`);
        
        // Disable the vote button to prevent double voting
        const voteButtons = document.querySelectorAll(`[data-candidate="${candidateName}"]`);
        voteButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Voted ✓';
            btn.classList.add('voted');
        });
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
                ${candidate.photo ? `<img src="${candidate.photo.startsWith('data:') ? candidate.photo : 'http://localhost:5000/uploads/' + sanitizeHTML(candidate.photo)}" alt="${sanitizeHTML(candidate.name)}" class="candidate-photo">` : '<div class="no-photo">No Photo</div>'}
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

// Admin form functions
function showAdminForm(formId) {
    document.getElementById('admin-forms').style.display = 'block';
    document.querySelectorAll('#admin-forms > div').forEach(form => form.style.display = 'none');
    document.getElementById(formId).style.display = 'block';
}

function hideAdminForms() {
    document.getElementById('admin-forms').style.display = 'none';
}

async function handleCreateElection(e) {
    e.preventDefault();
    const name = document.getElementById('election-name').value;
    const description = document.getElementById('election-description').value;
    const startDate = document.getElementById('election-start').value;
    const endDate = document.getElementById('election-end').value;
    
    try {
        await apiRequest('/elections', {
            method: 'POST',
            body: JSON.stringify({ name, description, startDate, endDate })
        });
        alert('Election created successfully!');
        hideAdminForms();
        document.getElementById('election-form').reset();
    } catch (error) {
        alert('Failed to create election: ' + error.message);
    }
}

async function loadElectionsForUpdate() {
    try {
        const data = await apiRequest('/elections');
        const select = document.getElementById('update-election-select');
        select.innerHTML = '<option value="">Select Election to Update</option>';
        
        (data.data || []).forEach(election => {
            const option = document.createElement('option');
            option.value = election._id;
            option.textContent = election.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load elections:', error);
    }
}

async function loadElectionForUpdate() {
    const electionId = document.getElementById('update-election-select').value;
    if (!electionId) {
        document.getElementById('update-form').style.display = 'none';
        return;
    }
    
    try {
        const data = await apiRequest(`/elections/${electionId}`);
        const election = data.data;
        
        document.getElementById('update-election-name').value = election.name;
        document.getElementById('update-election-description').value = election.description;
        document.getElementById('update-election-start').value = election.startDate.split('T')[0];
        document.getElementById('update-election-end').value = election.endDate.split('T')[0];
        document.getElementById('update-form').style.display = 'block';
    } catch (error) {
        alert('Failed to load election details: ' + error.message);
    }
}

async function handleUpdateElection(e) {
    e.preventDefault();
    const electionId = document.getElementById('update-election-select').value;
    const name = document.getElementById('update-election-name').value;
    const description = document.getElementById('update-election-description').value;
    const startDate = document.getElementById('update-election-start').value;
    const endDate = document.getElementById('update-election-end').value;
    
    try {
        await apiRequest(`/elections/${electionId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description, startDate, endDate })
        });
        alert('Election updated successfully!');
        hideAdminForms();
    } catch (error) {
        alert('Failed to update election: ' + error.message);
    }
}

async function loadCandidatesForDelete() {
    try {
        const data = await apiRequest('/candidates');
        const select = document.getElementById('delete-candidate-select');
        select.innerHTML = '<option value="">Select Candidate to Delete</option>';
        
        (data.data || []).forEach(candidate => {
            const option = document.createElement('option');
            option.value = candidate._id;
            option.textContent = `${candidate.name} - ${candidate.position}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load candidates:', error);
    }
}

async function handleDeleteCandidate() {
    const candidateId = document.getElementById('delete-candidate-select').value;
    if (!candidateId) {
        alert('Please select a candidate to delete.');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this candidate?')) {
        return;
    }
    
    try {
        await apiRequest(`/candidates/${candidateId}`, {
            method: 'DELETE'
        });
        alert('Candidate deleted successfully!');
        hideAdminForms();
        loadCandidatesForDelete();
    } catch (error) {
        alert('Failed to delete candidate: ' + error.message);
    }
}

// Load elections for candidate form
async function loadElectionsForCandidateForm() {
    try {
        const data = await apiRequest('/elections');
        const select = document.getElementById('candidate-election');
        if (select) {
            select.innerHTML = '<option value="">Select Election</option>';
            (data.data || []).forEach(election => {
                const option = document.createElement('option');
                option.value = election._id;
                option.textContent = election.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load elections:', error);
    }
}

// Handle add candidate form submission
async function handleAddCandidate(e) {
    e.preventDefault();
    const name = document.getElementById('candidate-name').value;
    const manifesto = document.getElementById('candidate-manifesto').value;
    const electionId = document.getElementById('candidate-election').value;
    const position = document.getElementById('candidate-position').value;
    const photoFile = document.getElementById('candidate-photo').files[0];
    
    if (!name || !manifesto || !electionId || !position) {
        alert('Please fill in all required fields.');
        return;
    }
    
    let photoData = null;
    if (photoFile) {
        // Convert photo to base64 for demo mode storage
        photoData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(photoFile);
        });
    }
    
    try {
        await apiRequest('/candidates', {
            method: 'POST',
            body: JSON.stringify({
                name,
                manifesto,
                electionId,
                position,
                photo: photoData
            })
        });
        alert('Candidate added successfully!');
        document.getElementById('add-candidate-form').style.display = 'none';
        document.getElementById('candidate-form').reset();
        loadAllCandidates();
    } catch (error) {
        alert('Failed to add candidate: ' + error.message);
    }
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
    
    // Back button for candidates section
    const backToDashboardCandidates = document.getElementById('back-to-dashboard-candidates');
    if (backToDashboardCandidates) {
        backToDashboardCandidates.addEventListener('click', () => showSection(dashboardSection));
    }
    
    // Back button for results section
    const backToDashboardResults = document.getElementById('back-to-dashboard-results');
    if (backToDashboardResults) {
        backToDashboardResults.addEventListener('click', () => showSection(dashboardSection));
    }
    
    // Home buttons from all sections
    const homeBtn = document.getElementById('home-btn');
    const homeBtnElections = document.getElementById('home-btn-elections');
    const homeBtnCandidates = document.getElementById('home-btn-candidates');
    const homeBtnResults = document.getElementById('home-btn-results');
    const homeBtnAdmin = document.getElementById('home-btn-admin');
    
    if (homeBtn) {
        homeBtn.addEventListener('click', () => showSection(homeSection));
    }
    if (homeBtnElections) {
        homeBtnElections.addEventListener('click', () => showSection(homeSection));
    }
    if (homeBtnCandidates) {
        homeBtnCandidates.addEventListener('click', () => showSection(homeSection));
    }
    if (homeBtnResults) {
        homeBtnResults.addEventListener('click', () => showSection(homeSection));
    }
    if (homeBtnAdmin) {
        homeBtnAdmin.addEventListener('click', () => showSection(homeSection));
    }
    
    // Learn More button on home page
    const heroAboutBtn = document.getElementById('hero-about-btn');
    if (heroAboutBtn) {
        heroAboutBtn.addEventListener('click', () => {
            document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href').substring(1);
            document.getElementById(target).scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Footer login button
    const footerLogin = document.getElementById('footer-login');
    if (footerLogin) {
        footerLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(loginSection);
        });
    }
    
    // Nav login button
    const navLoginBtn = document.getElementById('nav-login-btn');
    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', () => showSection(loginSection));
    }
    
    // Mobile menu toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking nav links
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
        
        // Close menu when clicking login button
        if (navLoginBtn) {
            navLoginBtn.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        }
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
    
    // Admin button
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) {
        navAdmin.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                showSection(adminSection);
            } else {
                alert('Admin panel is only available to administrators.');
            }
        });
    }
    
    // Admin dashboard buttons
    const createElectionBtn = document.getElementById('create-election-btn');
    const updateElectionBtn = document.getElementById('update-election-btn');
    const deleteCandidateBtn = document.getElementById('delete-candidate-btn');
    const viewAllVotesBtn = document.getElementById('view-all-votes');
    const backToDashboardAdmin = document.getElementById('back-to-dashboard-admin');
    
    if (createElectionBtn) {
        createElectionBtn.addEventListener('click', () => {
            showAdminForm('create-election-form');
        });
    }
    
    if (updateElectionBtn) {
        updateElectionBtn.addEventListener('click', () => {
            loadElectionsForUpdate();
            showAdminForm('update-election-form');
        });
    }
    
    if (deleteCandidateBtn) {
        deleteCandidateBtn.addEventListener('click', () => {
            loadCandidatesForDelete();
            showAdminForm('delete-candidate-form');
        });
    }
    
    if (viewAllVotesBtn) {
        viewAllVotesBtn.addEventListener('click', () => {
            showSection(resultsSection);
            loadAllResults();
        });
    }
    
    if (backToDashboardAdmin) {
        backToDashboardAdmin.addEventListener('click', () => showSection(dashboardSection));
    }
    
    // Refresh results button
    const refreshResultsBtn = document.getElementById('refresh-results');
    if (refreshResultsBtn) {
        refreshResultsBtn.addEventListener('click', () => {
            loadAllResults();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authToken = null;
            currentUser = null;
            localStorage.removeItem('token');
            showSection(homeSection);
        });
    }
    
    // Admin form handlers
    const electionForm = document.getElementById('election-form');
    const updateForm = document.getElementById('update-form');
    const updateElectionSelect = document.getElementById('update-election-select');
    const confirmDeleteBtn = document.getElementById('confirm-delete-candidate');
    
    if (electionForm) {
        electionForm.addEventListener('submit', handleCreateElection);
    }
    
    if (updateForm) {
        updateForm.addEventListener('submit', handleUpdateElection);
    }
    
    if (updateElectionSelect) {
        updateElectionSelect.addEventListener('change', loadElectionForUpdate);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteCandidate);
    }
    
    // Add candidate button and form
    const addCandidateBtn = document.getElementById('add-candidate-btn');
    const addCandidateForm = document.getElementById('add-candidate-form');
    const candidateForm = document.getElementById('candidate-form');
    const cancelAddCandidate = document.getElementById('cancel-add-candidate');
    
    if (addCandidateBtn) {
        addCandidateBtn.addEventListener('click', () => {
            if (addCandidateForm) {
                addCandidateForm.style.display = 'block';
                loadElectionsForCandidateForm();
            }
        });
    }
    
    if (candidateForm) {
        candidateForm.addEventListener('submit', handleAddCandidate);
    }
    
    if (cancelAddCandidate) {
        cancelAddCandidate.addEventListener('click', () => {
            if (addCandidateForm) {
                addCandidateForm.style.display = 'none';
                candidateForm.reset();
            }
        });
    }
    
    // Cancel buttons
    document.getElementById('cancel-create-election')?.addEventListener('click', () => hideAdminForms());
    document.getElementById('cancel-update-election')?.addEventListener('click', () => hideAdminForms());
    document.getElementById('cancel-delete-candidate')?.addEventListener('click', () => hideAdminForms());
    
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
    
    // Initialize - check authentication
    if (authToken) {
        // In demo mode, restore user session
        if (DEMO_MODE) {
            currentUser = { name: 'Demo User', email: 'demo@example.com', role: 'voter' };
        }
        showSection(homeSection);
    } else {
        showSection(homeSection);
    }
});