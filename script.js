const fileInput = document.getElementById("fileInput");
const fileInput1 = document.getElementById("splBeeFile");
const playlist = document.getElementById("playlist");
const player = document.getElementById("player");
let tracks = [];
let selected = [];
let selecting = false;
let tracksSpelling = [];
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
                    tracks.push({
                        name: name,
                        url: URL.createObjectURL(await entry.async("blob")),
                        spelling: document.getElementById("name").checked ? name.replace(/\.[^.]+$/, "") : "",
                        partOfSpeech: ""
                    });
                }
            } catch (error) {
                document.getElementById("zip-bad").textContent = "Could not read ZIP file: '" + file.name + "'. It may be encrypted, corrupted, or unsupported.";
                setTimeout(() => {
                    document.getElementById("zip-bad").textContent = "";
                }, 5000);
            }
        } else {
            const exists = tracks.some(function(track) {
                return track.name === file.name;
            });
            if (!exists && file.type.startsWith("audio/")) {
                tracks.push({
                    name: file.name,
                    url: URL.createObjectURL(file),
                    spelling: document.getElementById("name").checked ? file.name.replace(/\.[^.]+$/, "") : "",
                    partOfSpeech: ""
                });
            }
        }
    }
    renderPlaylist();
    fileInput.value = "";
};
fileInput1.onchange = async function() {
    const zipFile = fileInput1.files[0];
    try {
        const decodedZip = await JSZip.loadAsync(zipFile);
        const manifest = JSON.parse(await decodedZip.file("manifest.json").async("string"));
        if (manifest.format !== "spelling-bee" || typeof manifest.tracks !== "object" || manifest.tracks === null || !Array.isArray(manifest.tracks)) {
            document.getElementById("zip-bad").textContent = "Your .splbee file is not formatted correctly.";
            setTimeout(() => {
                document.getElementById("zip-bad").textContent = "";
            }, 5000);
            return;
        } else if (manifest.version !== 1) {
            document.getElementById("zip-bad").textContent = "Your .splbee file uses an unsupported version.";
            setTimeout(() => {
                document.getElementById("zip-bad").textContent = "";
            }, 5000);
            return;
        }
        document.getElementById("case").checked = manifest.settings.case;
        document.getElementById("adv1").checked = manifest.settings.adv1;
        document.getElementById("adv2").checked = manifest.settings.adv2;
        for (const track of tracks) {
            URL.revokeObjectURL(track.url);
        }
        tracks.length = 0;
        for (const obj of manifest.tracks) {
            const audioFile = decodedZip.file(obj.file);
            if (!audioFile) {
                continue;
            }
            tracks.push({
                name: obj.name,
                url: URL.createObjectURL(await audioFile.async("blob")),
                spelling: obj.spelling,
                partOfSpeech: obj.partOfSpeech
            });
        }
        renderPlaylist();
    } catch (error) {
        document.getElementById("zip-bad").textContent = error.name + ": " + error.message;
        setTimeout(() => {
            document.getElementById("zip-bad").textContent = "";
        }, 5000);
    } finally {
        fileInput1.value = "";
    }
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
        input.value = track.spelling;
        let input1 = "";
        if (document.getElementById("adv1").checked) {
            input1 = document.createElement("select");
            input1.id = "speech" + index;
            input1.onchange = function() {
                track.partOfSpeech = input1.value;
                updateButtons();
            };
            const firstOption = document.createElement("option");
            firstOption.textContent = "Part of Speech";
            firstOption.selected = firstOption.disabled = true;
            firstOption.value = "";
            input1.appendChild(firstOption);
            ["Noun", "Pronoun", "Verb", "Adverb", "Adjective", "Preposition", "Conjunction", "Interjection"].forEach(item => {
                const option = document.createElement("option");
                option.textContent = item;
                input1.appendChild(option);
            });
            input1.value = track.partOfSpeech;
        }
        item.append(name, input, input1);
        input.disabled = selecting;
        if (input1 instanceof HTMLSelectElement) {
            input1.disabled = selecting;
        }
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
    playlist.querySelectorAll("input, select").forEach(function(input) {
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
        let arr = [obj.name, obj.url, obj.spelling.trim()];
        if (obj.partOfSpeech) {
            arr.push(obj.partOfSpeech);
        }
        tracksSpelling.push(arr);
    }
    for (let i = tracksSpelling.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracksSpelling[i], tracksSpelling[j]] = [tracksSpelling[j], tracksSpelling[i]];
    }
    document.getElementById("partOfSpeechSelect").hidden = !document.getElementById("adv1").checked;
    document.getElementById("i1").hidden = true;
    document.getElementById("i2").hidden = false;
}
function back(next = false) {
    player.pause();
    player.currentTime = 0;
    document.getElementById("l1").disabled = false;
    document.querySelectorAll(".l").forEach(function(element) {
        element.disabled = false;
    });
    document.getElementById("check").textContent = "Check";
    document.getElementById("spell").disabled = false;
    document.getElementById("partOfSpeechSelect").disabled = false;
    document.getElementById("spell").value = "";
    document.getElementById("partOfSpeechSelect").value = "";
    document.getElementById("hint").textContent = "";
    document.getElementById("error-message").textContent = "";
    if (!next) {
        tracksSpelling = [];
        document.getElementById("i1").hidden = false;
        document.getElementById("i2").hidden = true;
    }
}
function check(button) {
    if (button.textContent === "Check") {
        player.pause();
        player.currentTime = 0;
        const value = document.getElementById("spell").value.trim();
        let errorMessage = [];
        let correct = true;
        if (!value || (document.getElementById("adv1").checked && !document.getElementById("partOfSpeechSelect").value)) {
            return;
        }
        if ((value !== tracksSpelling[0][2] && !document.getElementById("case").checked) || (value.toLowerCase() !== tracksSpelling[0][2].toLowerCase() && document.getElementById("case").checked)) {
            errorMessage.push(`Correct spelling is: '${tracksSpelling[0][2]}'.`);
            correct = false;
        }
        if (document.getElementById("adv1").checked && tracksSpelling[0][3] !== document.getElementById("partOfSpeechSelect").value) {
            errorMessage.push(`Correct part of speech is: '${tracksSpelling[0][3]}'.`);
            correct = false;
        }
        if (correct) {
            errorMessage.push("Correct!");
            tracksSpelling.shift();
        } else {
            errorMessage.unshift("Incorrect!");
            tracksSpelling.push(tracksSpelling.shift());
        }
        document.getElementById("spell").disabled = true;
        document.getElementById("partOfSpeechSelect").disabled = true;
        button.textContent = tracksSpelling.length === 0 ? "Finish" : "Next";
        if (tracksSpelling.length === 0) {document.getElementById("l1").disabled = true;}
        document.querySelectorAll(".l").forEach(function(element) {
            element.disabled = true;
        });
        document.getElementById("error-message").textContent = errorMessage.join("\n");
    } else if (button.textContent === "Next") {
        back(true);
    } else {
        back();
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
    document.getElementById("nextButton").disabled = document.getElementById("export-file").disabled = tracks.length === 0
        || tracks.some(function(track) {return !track.spelling.trim()
        || (document.getElementById("adv1").checked && !track.partOfSpeech)});
    document.getElementById("deleteButton").disabled = tracks.length === 0;
}
updateButtons();

function editAdvanced(fOrB) {
    document.getElementById("i1").hidden = fOrB;
    document.getElementById("i3").hidden = !fOrB;
}
document.getElementById("adv1").addEventListener("change", (e) => {
    if (!e.target.checked) {
        tracks.forEach(function(track) {
            track.partOfSpeech = "";
        });
    }
    renderPlaylist();
});
document.getElementById("adv2").addEventListener("change", (e) => {
    renderPlaylist();
});
async function exportFile() {
    const zip = new JSZip();
    const audioFolder = zip.folder("audio");
    const manifest = {
        format: "spelling-bee",
        version: 1,
        settings: {
            case: document.getElementById("case").checked,
            adv1: document.getElementById("adv1").checked,
            adv2: document.getElementById("adv2").checked
        },
        tracks: []
    };
    try {
        document.getElementById("export-file").disabled = true;
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const response = await fetch(track.url);
            const blob = await response.blob();
            const extension = track.name.match(/\.[^.]+$/)?.[0] || "";
            const filename = i + extension;
            const path = "audio/" + filename;
            audioFolder.file(filename, blob);
            manifest.tracks.push({
                name: track.name,
                file: path,
                spelling: track.spelling,
                partOfSpeech: track.partOfSpeech
            });
        }
        zip.file("manifest.json", JSON.stringify(manifest, "\n", 4));
        const zipBlob = await zip.generateAsync({
            type: "blob"
        });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "unnamed.splbee";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => {URL.revokeObjectURL(url)}, 1000);
    } catch (error) {
        document.getElementById("zip-bad").textContent = "Export failed: " + error.message;
        setTimeout(() => {
            document.getElementById("zip-bad").textContent = "";
        }, 5000);
    } finally {
        updateButtons();
    }
}
