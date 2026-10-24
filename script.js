const fileInput = document.getElementById("fileInput");
const playlist = document.getElementById("playlist");
const player = document.getElementById("player");
let tracks = [];
let selected = [];
let selecting = false;
let tracksSpelling = [];
function addAudio() {
    fileInput.click();
}
fileInput.onchange = async function() {
    for (const file of fileInput.files) {
        if (file.name.toLowerCase().endsWith(".zip")) {
            try {
                const zip = await JSZip.loadAsync(file);
                for (const entry of Object.values(zip.files)) {
                    if (entry.dir || !/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(entry.name)) {
                        continue;
                    }
                    const name = entry.name.split("/").pop();
                    if (tracks.some(function(track) {
                        return track.name === name;
                    })) {
                        continue;
                    }
                    const blob = await entry.async("blob");
                    const url = URL.createObjectURL(blob);
                    tracks.push({
                        name: name,
                        url: url,
                        spelling: ""
                    });
                }
            } catch (error) {
                document.getElementById("zip-bad").textContent = "Could not read ZIP file: " + file.name + ". It may be encrypted, corrupted, or unsupported.";
                setTimeout(() => {
                    document.getElementById("zip-bad").textContent = "";
                }, 5000);
                alert("Could not read ZIP file: " + file.name);
            }
        } else {
            const exists = tracks.some(function(track) {
                return track.name === file.name;
            });
            if (!exists && file.type.startsWith("audio/")) {
                tracks.push({
                    name: file.name,
                    url: URL.createObjectURL(file),
                    spelling: ""
                });
            }
        }
    }
    renderPlaylist();
    fileInput.value = "";
};

function renderPlaylist() {
    playlist.innerHTML = "";
    tracks.forEach(function(track, index) {
        const item = document.createElement("div");
        const name = document.createElement("span");
        name.textContent = track.name + " - ";
        const input = document.createElement("input");
        input.type = "text";
        input.id = String(index);
        input.placeholder = "enter correct spelling here...";
        item.append(name, input);
        input.value = track.spelling;
        input.oninput = function() {
            track.spelling = input.value;
            updateButtons();
        };
        item.className = selected.includes(index) ? "selected" : "";
        item.style.cursor = selecting ? "pointer" : "text";
        item.onclick = function() {
            if (selecting) {
                if (selected.includes(index)) {
                    selected = selected.filter(function(i) {
                        return i !== index;
                    });
                } else {
                    selected.push(index);
                }
                renderPlaylist();
            }
        };
        playlist.appendChild(item);
    });
    updateButtons();
}
function selectAudio() {
    document.getElementById("buttons1").hidden = true;
    document.getElementById("buttons2").hidden = false;
    selecting = true;
    selected = [];
    renderPlaylist();
    playlist.querySelectorAll("input").forEach(function(input) {
        input.disabled = true;
    });
}
function deleteAudio() {
    if (selected.length === 0) {
        return;
    }
    selected.sort(function(a, b) {
        return b - a;
    });
    for (const index of selected) {
        URL.revokeObjectURL(tracks[index].url);
        tracks.splice(index, 1);
    }
    selected = [];
    selecting = false;
    document.getElementById("buttons1").hidden = false;
    document.getElementById("buttons2").hidden = true;
    renderPlaylist();
    playlist.querySelectorAll("input").forEach(function(input) {
        input.disabled = false;
    });
}
function cancel() {
    document.getElementById("buttons1").hidden = false;
    document.getElementById("buttons2").hidden = true;
    selected = [];
    selecting = false;
    renderPlaylist();
    playlist.querySelectorAll("input").forEach(function(input) {
        input.disabled = false;
    });
}
function playAudio() {
    player.src = tracksSpelling[0][1];
    player.play();
}
function next() {
    tracksSpelling = [];
    for (const obj of tracks) {
        tracksSpelling.push([obj.name, obj.url, obj.spelling.trim()]);
    }
    for (let i = tracksSpelling.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracksSpelling[i], tracksSpelling[j]] = [tracksSpelling[j], tracksSpelling[i]];
    }
    document.getElementById("i1").hidden = true;
    document.getElementById("i2").hidden = false;
}
function back() {
    player.pause();
    player.currentTime = 0;
    tracksSpelling = [];
    document.getElementById("l1").disabled = false;
    document.querySelectorAll(".l").forEach(function(element) {
        element.disabled = false;
    });
    document.getElementById("check").textContent = "Check";
    document.getElementById("spell").disabled = false;
    document.getElementById("spell").value = "";
    document.getElementById("hint").textContent = "";
    document.getElementById("i1").hidden = false;
    document.getElementById("i2").hidden = true;
}
function check(button) {
    if (button.textContent === "Check") {
        player.pause();
        player.currentTime = 0;
        const value = document.getElementById("spell").value.trim();
        if (document.getElementById("spell").value.trim() === "") {
            return;
        } else if ((value === tracksSpelling[0][2]
                   && !document.getElementById("case").checked)
                   || (value.toLowerCase() === tracksSpelling[0][2].toLowerCase()
                   && document.getElementById("case").checked)) {
            document.getElementById("spell").value = "Correct!";
            tracksSpelling.shift();
        } else {
            document.getElementById("spell").value = `Incorrect! Correct spelling is: '${tracksSpelling[0][2]}'.`;
            tracksSpelling.push(tracksSpelling.shift());
        }
        document.getElementById("spell").disabled = true;
        button.textContent = tracksSpelling.length === 0 ? "Finish" : "Next";
        if (tracksSpelling.length === 0) {document.getElementById("l1").disabled = true;}
        document.querySelectorAll(".l").forEach(function(element) {
            element.disabled = true;
        });
    } else {
        if (tracksSpelling.length === 0) {
            back();
        }
        document.getElementById("l1").disabled = false;
        document.querySelectorAll(".l").forEach(function(element) {
            element.disabled = false;
        });
        button.textContent = "Check";
        document.getElementById("spell").disabled = false;
        document.getElementById("spell").value = "";
        document.getElementById("hint").textContent = "";
    }
}
function hint() {
    const spelling = tracksSpelling[0][2];
    let uns = "";
    for (const char of spelling) {
        uns += char === " " ? "\u00A0\u00A0" : " _";
    }
    const hint = spelling[0] + uns.slice(2);
    document.getElementById("hint").textContent = "Hint: " + hint;
}
function updateButtons() {
    document.getElementById("nextButton").disabled = tracks.length === 0 || tracks.some(function(track) {
        return track.spelling.trim() === "";
    });
    document.getElementById("deleteButton").disabled = tracks.length === 0;
}
updateButtons();
