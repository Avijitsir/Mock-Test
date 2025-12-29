// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDwGzTPmFg-gjoYtNWNJM47p22NfBugYFA",
    authDomain: "mock-test-1eea6.firebaseapp.com",
    databaseURL: "https://mock-test-1eea6-default-rtdb.firebaseio.com",
    projectId: "mock-test-1eea6",
    storageBucket: "mock-test-1eea6.firebaseapp.com",
    messagingSenderId: "111849173136",
    appId: "1:111849173136:web:8b211f58d854119e88a815",
    measurementId: "G-5RLWPTP8YD"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Globals ---
let currentQuestions = [];
let editingQuizId = null;
let allQuizzes = [];

// --- Navigation ---
function showDashboard() {
    document.getElementById('view-dashboard').style.display = 'block';
    document.getElementById('view-editor').style.display = 'none';
    document.getElementById('view-results').style.display = 'none';
    loadQuizList();
}

// --- Dashboard Logic ---
function loadQuizList() {
    const container = document.getElementById('quiz-list-container');
    container.innerHTML = 'Loading...';
    
    database.ref('quizzes').once('value', (snapshot) => {
        container.innerHTML = '';
        allQuizzes = [];
        if (!snapshot.exists()) {
            container.innerHTML = '<div style="text-align:center; color:#888;">No quizzes found. Create one!</div>';
            return;
        }

        snapshot.forEach((child) => {
            const q = child.val();
            const id = child.key;
            allQuizzes.push({ id, ...q });

            const div = document.createElement('div');
            div.className = 'quiz-list-item';
            div.innerHTML = `
                <div>
                    <strong>${q.title || 'Untitled'}</strong><br>
                    <small>${q.questions ? q.questions.length : 0} Questions • ${q.duration} Mins</small>
                </div>
                <div>
                    <button onclick="viewResults('${id}', '${q.title}')" style="margin-right:5px;">📊 Results</button>
                    <button onclick="editQuiz('${id}')" style="margin-right:5px;">✏️ Edit</button>
                    <button onclick="deleteQuiz('${id}')" style="color:red;">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

function filterQuizzes() {
    const text = document.getElementById('search-quiz').value.toLowerCase();
    const items = document.getElementsByClassName('quiz-list-item');
    Array.from(items).forEach(item => {
        const title = item.getElementsByTagName('strong')[0].innerText.toLowerCase();
        item.style.display = title.includes(text) ? 'flex' : 'none';
    });
}

function createNewQuiz() {
    editingQuizId = null;
    currentQuestions = [];
    document.getElementById('quiz-title-input').value = '';
    document.getElementById('quiz-duration').value = '60';
    document.getElementById('share-link-box').style.display = 'none';
    
    document.getElementById('view-dashboard').style.display = 'none';
    document.getElementById('view-editor').style.display = 'block';
    renderQuestions();
}

function editQuiz(id) {
    editingQuizId = id;
    database.ref('quizzes/' + id).once('value', (snapshot) => {
        const data = snapshot.val();
        document.getElementById('quiz-title-input').value = data.title;
        document.getElementById('quiz-duration').value = data.duration;
        document.getElementById('quiz-pass-mark').value = data.passMark || 30;
        document.getElementById('quiz-pos-mark').value = data.posMark || 1;
        document.getElementById('quiz-neg-mark').value = data.negMark || 0.25;
        document.getElementById('rand-question-check').checked = data.randomizeQuestions || false;
        document.getElementById('rand-option-check').checked = data.randomizeOptions || false;
        
        currentQuestions = data.questions || [];
        
        document.getElementById('view-dashboard').style.display = 'none';
        document.getElementById('view-editor').style.display = 'block';
        document.getElementById('share-link-box').style.display = 'none';
        renderQuestions();
    });
}

function deleteQuiz(id) {
    if(confirm("Are you sure you want to delete this quiz?")) {
        database.ref('quizzes/' + id).remove().then(() => loadQuizList());
    }
}

// --- Editor Logic (With Section Support) ---

function processBulk() {
    const text = document.getElementById('bulk-text').value.trim();
    if (!text) return alert("Please paste some text first!");

    // 1. Get Section Name from new input
    const sectionName = document.getElementById('current-section-name').value.trim() || "General";

    const blocks = text.split(/\n\s*\n/); // Split by blank lines
    let count = 0;

    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) return;

        let correctIndex = 0;
        let options = [];
        let questionText = lines[0]; // First line is question

        // Try to find answer line
        let ansLineIndex = lines.findIndex(l => l.toLowerCase().startsWith('answer:'));
        
        if (ansLineIndex !== -1) {
            let ansText = lines[ansLineIndex].replace(/answer:/i, '').trim();
            // Options are everything between Question and Answer line
            options = lines.slice(1, ansLineIndex);
            
            // Find which option matches the answer text
            let foundIdx = options.findIndex(o => o.trim() === ansText);
            if(foundIdx !== -1) correctIndex = foundIdx;
        } else {
            // If no "Answer:" tag, assume all remaining lines are options and correct is A (0)
            options = lines.slice(1);
            correctIndex = 0; 
        }

        // Add to main array WITH SUBJECT
        currentQuestions.push({
            id: Date.now() + Math.random(),
            question: questionText,
            options: options,
            correctIndex: correctIndex, // Storing as Number
            explanation: "",
            subject: sectionName // <--- Storing Section Name
        });
        count++;
    });

    renderQuestions();
    document.getElementById('bulk-text').value = '';
    alert(`${count} টি প্রশ্ন '${sectionName}' সেকশনে যোগ করা হয়েছে!`);
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    currentQuestions.forEach((q, index) => {
        // Create Badge HTML
        const subjBadge = q.subject ? 
            `<span style="background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:5px; border:1px solid #bbdefb;">${q.subject}</span>` 
            : '';

        const div = document.createElement('div');
        div.className = 'q-card';
        div.innerHTML = `
            <div class="q-header">
                <span style="display:flex; align-items:center;">
                    ${subjBadge} 
                    <strong>Q${index + 1}.</strong> &nbsp; ${q.question.substring(0, 40)}...
                </span>
                <button onclick="deleteQuestion(${index})" style="color:red; border:none; background:none; cursor:pointer;">🗑️</button>
            </div>
            <div style="font-size:12px; color:#666; padding-left:5px;">
                Correct: ${q.options[q.correctIndex]}
            </div>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('total-q-count').innerText = currentQuestions.length;
    
    // Refresh MathJax
    if(window.MathJax) MathJax.typesetPromise();
}

function deleteQuestion(index) {
    if(confirm("Delete this question?")) {
        currentQuestions.splice(index, 1);
        renderQuestions();
    }
}

function saveQuiz() {
    const title = document.getElementById('quiz-title-input').value.trim();
    if (!title) return alert("Please enter a Quiz Title");

    const quizData = {
        title: title,
        duration: document.getElementById('quiz-duration').value,
        passMark: document.getElementById('quiz-pass-mark').value,
        posMark: document.getElementById('quiz-pos-mark').value,
        negMark: document.getElementById('quiz-neg-mark').value,
        randomizeQuestions: document.getElementById('rand-question-check').checked,
        randomizeOptions: document.getElementById('rand-option-check').checked,
        questions: currentQuestions
    };

    if (editingQuizId) {
        database.ref('quizzes/' + editingQuizId).update(quizData).then(() => {
            finishSave(editingQuizId);
        });
    } else {
        const newRef = database.ref('quizzes').push();
        newRef.set(quizData).then(() => {
            finishSave(newRef.key);
        });
    }
}

function finishSave(id) {
    alert("Quiz Saved Successfully!");
    const link = window.location.href.replace('admin.html', 'index.html').split('?')[0] + '?id=' + id;
    document.getElementById('generated-link').value = link;
    document.getElementById('share-link-box').style.display = 'block';
}

function copyLink() {
    const copyText = document.getElementById("generated-link");
    copyText.select();
    document.execCommand("copy");
    alert("Link copied to clipboard!");
}

// --- Result View ---
function viewResults(id, title) {
    document.getElementById('view-dashboard').style.display = 'none';
    document.getElementById('view-results').style.display = 'block';
    document.getElementById('res-quiz-title').innerText = title;
    
    const tbody = document.getElementById('results-body');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    database.ref('results/' + id).once('value', (snapshot) => {
        tbody.innerHTML = '';
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="3">No results found yet.</td></tr>';
            return;
        }
        
        const results = [];
        snapshot.forEach(child => results.push(child.val()));
        
        // Sort by score (descending)
        results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:10px; border-bottom:1px solid #eee;">${r.name}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold;">${r.score}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; color:#666; font-size:12px;">${r.date}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// Initial Load
showDashboard();
