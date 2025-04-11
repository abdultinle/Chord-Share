/* public/js/script.js file for functionality */

document.addEventListener('DOMContentLoaded', () => {
	const searchForm = document.getElementById("search-form");
	const resultsDiv = document.getElementById("results");

	if (searchForm) {
		searchForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const term = document.getElementById("term").value;
			const res = await fetch(`/search?term=${term}`);
			const songs = await res.json();

			resultsDiv.innerHTML = "";
			songs.forEach ( (song) => {
				const div = document.createElement("div");
				div.className = "song-box";
				div.innerHTML = `
				<strong>${song.trackName}</strong> by ${song.artistName} <br>
				<img src="${song.artworkUrl60}" alt="art" />
				<form onsubmit="saveChord(event, ${song.trackId}, '${song.artistName}', '${song.trackName}')">
				<label> Chords: </label><br>
				<textarea rows="2" cols="40" required></textarea><br>
				<button class="btn" type="submit">Save Chords</button>
				</form>
				`;
				resultsDiv.appendChild(div);
			});
		});
	}
});

function saveChord(event, trackId, artistName, trackName) {
	event.preventDefault();
	const chords = event.target.querySelector("textarea").value;
	fetch("/saveChord", {
		method: "POST",
		headers: { "Content-Type": "application/json"},
		body: JSON.stringify({ trackId, artistName, trackName, chords }),
	}).then(() => alert("Chord saved!"));
}

	