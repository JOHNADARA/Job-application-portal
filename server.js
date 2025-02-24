const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Set up SQLite database
const db = new sqlite3.Database('./applications.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the applications database.');
});

// Create applications table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    position TEXT NOT NULL,
    resumePath TEXT NOT NULL,
    coverLetter TEXT,
    experience INTEGER NOT NULL,
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle form submission
app.post('/submit-application', upload.single('resume'), (req, res) => {
    const {
        fullName,
        email,
        phone,
        position,
        coverLetter,
        experience
    } = req.body;

    const resumePath = req.file ? `/uploads/${req.file.filename}` : '';

    // Insert into database
    const stmt = db.prepare(`INSERT INTO applications (
        fullName, email, phone, position, resumePath, coverLetter, experience
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    stmt.run(
        fullName,
        email,
        phone || null,
        position,
        resumePath,
        coverLetter || null,
        experience,
        (err) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, message: 'Application submitted successfully' });
        }
    );
    stmt.finalize();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});