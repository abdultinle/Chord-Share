/*
Project: ChordShare - Collaborative Chord Archive
Stack: Express.js + Handlebars + better-sqlite3 + iTunes API
Author: Abdullahi Omar
*/

//Basic Express Server with hbs Template Engine

const express = require("express");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const betterSqlite3 = require("better-sqlite3");
const db = new betterSqlite3("./data/chordshare.sqlite");


const app = express(); 
const PORT = process.env.PORT || 3000


// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 
app.use(express.static(path.join(__dirname, "public"))); 
app.use(
	session({
		secret: "chordshare-secret",
		resave: false,
		saveUninitialized: false,
	})
); 

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

//place helper
const hbs = require("hbs");
hbs.registerHelper("ifCond", function (v1, operator, v2, options){
	switch (operator) {
	case "==":
		return v1 == v2 ? options.fn(this) : options.inverse(this);
	case "===":
		return v1 === v2 ? options.fn(this) : options.inverse(this);
	case "!=":
		return v1 != v2 ? options.fn(this) : options.inverse(this);
	case "!==":
		return v1 !== v2 ? options.fn(this) : options.inverse(this);
	case "<":
		return v1 < v2 ? options.fn(this) : options.inverse(this);
	case "<=":
		return v1 <= v2 ? options.fn(this) : options.inverse(this);
	case ">":
		return v1 > v2 ? options.fn(this) : options.inverse(this);
	case ">=":
		return v1 >= v2 ? options.fn(this) : options.inverse(this);
	case "&&":
		return v1 && v2 ? options.fn(this) : options.inverse(this);
	case "||":
		return v1 || v2 ? options.fn(this) : options.inverse(this);
	default:
		return options.inverse(this);
	}
});

//Middleware for Authentication check 
function authRequired(req, res, next) {
	// body...
	if (!req.session.user) {
		return res.redirect("/login");
	}
	next();
}

function adminOnly(req, res, next) {
	// body...
	if (req.session.user && req.session.user.role === "admin") {
		return next();
	}
	return res.status(403).send("Forbidden: Admins only");
}


//Routes
app.get("/", (req, res) => {
	res.redirect("/home");
});


app.get("/login", (req, res) => {
	res.render("login", { title: "Login"});
});

app.post("/login", (req, res) => {
	const { userid, password } = req.body;
	const stmt = db.prepare("SELECT * FROM users WHERE userid=? AND password=?");
	const user = stmt.get(userid, password);
	if (user) {
		req.session.user = user;
		return res.redirect("/home");
	} else {
		return res.render("login", { title: "Login", message: "Invalid credentials." });
	}
});


app.get("/register", (req, res) => {
	res.render("register", { title: "Register"});
});

app.post("/register", (req, res) => {
	const { userid, password } = req.body;

	if (userid.toLowerCase() === "admin" || password.toLowerCase() === "admin") {
		return res.render("register", {
			title: "Register",
			message: "Username or password cannot be admin. Please choose something else."
		});
	}

	try {
		const stmt = db.prepare("INSERT INTO users (userid, password, role) VALUES (?, ?, 'guest')");
		stmt.run(userid, password);
		res.redirect("/login");
	} catch (err) {
		res.render("register", { title: "Register", message: "User already exists." });
	}	
});


app.get("/home", authRequired, (req, res) => {
	res.render("index", { title: "ChordShare", user: req.session.user });
});

app.get("/admin", [authRequired, adminOnly], (req, res) => {
	const users = db.prepare("SELECT userid, role FROM USERS").all();

	const chordEntries = db.prepare(`
		SELECT chordsets.id, users.userid, chordsets.trackName, chordsets.artistName, chordsets.chords
		FROM chordsets
		JOIN users ON chordsets.userid = users.userid
		`).all();

	res.render("admin", { title: "Admin Dashboard", users, chordEntries });
});


//Chord API Proxy and Save Feature
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

app.get("/search", authRequired, async (req, res) => {
	const query = req.query.term;
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=20&entity=song`;
	const response = await fetch(url);
	const data = await response.json();
	res.json(data.results);
});

app.post("/saveChord", authRequired, (req, res) => {
	const { trackId, artistName, trackName, chords } = req.body;
	const stmt = db.prepare(
		"INSERT INTO chordsets (userid, trackId, artistName, trackName, chords ) VALUES (?, ?, ?, ?, ?)"
		);
	stmt.run(req.session.user.userid, trackId, artistName, trackName, chords);
});

app.post("/admin/deleteChord", [authRequired, adminOnly], (req, res) => {
	const { chordId } = req.body;
	db.prepare("DELETE FROM chordsets WHERE id=?").run(chordId);
	res.redirect("/admin");
});

app.get("/mychords", authRequired, (req, res) => {
	const stmt = db.prepare("SELECT * FROM chordsets WHERE userid=?");
	const chords = stmt.all(req.session.user.userid);
	res.render("songDetails", { title: "My Chords", chordEntries: chords });
});


//Lgout
app.get("/logout", (req, res) => {
	req.session.destroy();
	res.redirect("/login");
});


//start server
app.listen(PORT, () => {
	console.log(`ChordShare running at http://localhost: ${PORT} CNTL:-C to stop`);
});
