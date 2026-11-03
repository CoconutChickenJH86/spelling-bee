const fileInput = document.getElementById("fileInput");
const fileInput1 = document.getElementById("splBeeFile");
const playlist = document.getElementById("playlist");
const player = document.getElementById("player");
let tracks = [];
let selected = [];
let selecting = false;
let tracksSpelling = [];
let hintN = 1;
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
                        partOfSpeech: "",
                        definition: ""
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
                    partOfSpeech: "",
                    definition: ""
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
        } else if (![1, 2].includes(manifest.version)) {
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
                partOfSpeech: obj.partOfSpeech,
                definition: obj?.def ?? ""
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
        item.className = selected.includes(index) ? "selected item" : "item";
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
        const name = document.createElement("span");
        name.textContent = track.name + ":";
        const input = document.createElement("input");
        input.type = "text";
        input.id = String(index);
        input.placeholder = "enter correct spelling here...";
        input.value = track.spelling;
        input.oninput = function() {
            track.spelling = input.value;
            updateButtons();
        };
        const input1 = document.createElement("select");
        input1.id = "speech" + index;
        input1.onchange = function() {
            track.partOfSpeech = input1.value;
            updateButtons();
        };
        const firstOption = document.createElement("option");
        firstOption.textContent = "Part of Speech";
        firstOption.disabled = true;
        firstOption.value = "";
        input1.appendChild(firstOption);
        ["Noun", "Pronoun", "Verb", "Adverb", "Adjective", "Preposition", "Conjunction", "Interjection"].forEach(item => {
            const option = document.createElement("option");
            option.textContent = item;
            input1.appendChild(option);
        });
        input1.value = track.partOfSpeech;
        const division = document.createElement("div");
        division.className = "inputs";
        division.append(input1, input);
        const input2 = document.createElement("input");
        input2.type = "text";
        input2.placeholder = "Definition";
        input2.value = track.definition;
        input2.oninput = function() {
            track.definition = input2.value;
            updateButtons();
        };
        item.append(name, division, input2);
        input.disabled = selecting;
        if (input1 instanceof HTMLSelectElement) {
            input1.disabled = selecting;
        }
        input2.disabled = selecting;
        playlist.append(item, document.createElement("hr"));
    });
    updateButtons();
}
function selectAudio() {
    document.getElementById("buttons1").hidden = true;
    document.getElementById("buttons2").hidden = false;
    selecting = true;
    selected = [];
    renderPlaylist();
    playlist.querySelectorAll("input[type='text'], select").forEach(function(input) {
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
    playlist.querySelectorAll("input[type='text'], select").forEach(function(input) {
        input.disabled = false;
    });
}
function cancel() {
    document.getElementById("buttons1").hidden = false;
    document.getElementById("buttons2").hidden = true;
    selected = [];
    selecting = false;
    renderPlaylist();
    playlist.querySelectorAll("input[type='text'], select").forEach(function(input) {
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
        tracksSpelling.push([obj.name, obj.url, obj.spelling.trim(), obj.partOfSpeech, obj.definition]);
    }
    for (let i = tracksSpelling.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracksSpelling[i], tracksSpelling[j]] = [tracksSpelling[j], tracksSpelling[i]];
    }
    document.getElementById("definitionQuiz").hidden = !document.getElementById("adv2").checked;
    if (document.getElementById("adv2").checked) {
        quizDefinition();
    }
    document.getElementById("partOfSpeechSelect").hidden = !document.getElementById("adv1").checked;
    document.getElementById("css1").classList.toggle("inputs", document.getElementById("adv1").checked);
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
    document.getElementById("spell").disabled = false;
    document.getElementById("partOfSpeechSelect").disabled = false;
    document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.disabled = true;
    });
    document.getElementById("check").textContent = "Check";
    document.getElementById("spell").value = "";
    document.getElementById("partOfSpeechSelect").value = "";
    document.getElementById("hint").textContent = "";
    document.getElementById("error-message").textContent = "";
    document.getElementById("dQuizContainer").innerHTML = "";
    if (!next) {
        tracksSpelling = [];
        document.getElementById("i1").hidden = false;
        document.getElementById("i2").hidden = true;
    }
    hintN = 1;
}
function check(button) {
    if (button.textContent === "Check") {
        player.pause();
        player.currentTime = 0;
        const value = document.getElementById("spell").value.trim();
        let errorMessage = [];
        let correct = true;
        if (!value
            || (document.getElementById("adv1").checked && !document.getElementById("partOfSpeechSelect").value)
            || (document.getElementById("adv2").checked && document.querySelector('input[name="1"]:checked')?.value === undefined)) {
            return;
        }
        if ((value !== tracksSpelling[0][2]
            && !document.getElementById("case").checked)
            || (value.toLowerCase() !== tracksSpelling[0][2].toLowerCase()
            && document.getElementById("case").checked)) {
            errorMessage.push(`Correct spelling is: '${tracksSpelling[0][2]}'.`);
            correct = false;
        }
        if (document.getElementById("adv1").checked && tracksSpelling[0][3] !== document.getElementById("partOfSpeechSelect").value) {
            errorMessage.push(`Correct part of speech is: '${tracksSpelling[0][3]}'.`);
            correct = false;
        }
        if (document.getElementById("adv2").checked && document.querySelector('input[name="1"]:checked').value !== tracksSpelling[0][4]) {
            errorMessage.push(`Correct definition is: '${tracksSpelling[0][4]}'.`);
            correct = false;
        }
        if (correct) {
            errorMessage.unshift("Correct!");
            tracksSpelling.shift();
        } else {
            errorMessage.unshift("Incorrect!");
            tracksSpelling.push(tracksSpelling.shift());
        }
        document.getElementById("spell").disabled = true;
        document.getElementById("partOfSpeechSelect").disabled = true;
        if (tracksSpelling.length === 0) {document.getElementById("l1").disabled = true;}
        document.querySelectorAll(".l").forEach(function(element) {
            element.disabled = true;
        });
        document.querySelectorAll('input[type="radio"]').forEach(input => {
            input.disabled = true;
        });
        button.textContent = tracksSpelling.length === 0 ? "Finish" : "Next";
        document.getElementById("error-message").textContent = errorMessage.join("\n");
    } else if (button.textContent === "Next") {
        back(true);
        if (document.getElementById("adv2").checked) {
            quizDefinition();
        }
    } else {
        back();
    }
}
function hint() {
    const spelling = tracksSpelling[0][2];
    if (spelling.length < 3) {
        document.getElementById("hint").textContent = "Word is too short for hint!";
        return;
    } else if (hintN > 3) {
        return;
    }
    let uns = "";
    for (const char of spelling) {
        uns += char === " " ? "\u00A0\u00A0" : " _";
    }
    let hint = "";
    for (let i = 0; i < hintN; i++) {
        hint += spelling[i];
    }
    hint += uns.slice(hintN * 2);
    hintN++;
    document.getElementById("hint").textContent = "Hint: " + hint;
}
function quizDefinition() {
    let options = [tracksSpelling[0][4]];
    for (let _ = 0; _ < 2; _++) {
        let picked;
        while (true) {
            picked = tracks[Math.floor(Math.random() * tracks.length)];
            if (!options.includes(picked.definition)) {
                break;
            }
        }
        options.push(picked.definition);
    }
    for (let i = 2; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    const quizParent = document.getElementById("dQuizContainer");
    quizParent.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "1";
        input.value = options[i];
        input.id = "o" + i;
        const inputLabel = document.createElement("label");
        inputLabel.textContent = options[i];
        inputLabel.htmlFor = "o" + i;
        quizParent.append(input, inputLabel, document.createElement("br"));
    }
}
function updateButtons() {
    let d1 = false;
    if (document.getElementById("adv2").checked) {
        let definitions = new Set();
        for (const obj of tracks) {
            definitions.add(obj.definition);
        }
        d1 = definitions.size > 2;
    }
    document.getElementById("nextButton").disabled = tracks.length === 0
        || tracks.some(function(track) {return !track.spelling.trim()
        || (document.getElementById("adv1").checked && !track.partOfSpeech)
        || (document.getElementById("adv2").checked && !track.definition)}
        || document.getElementById("adv2").checked && !d1
    );
    document.getElementById("deleteButton").disabled = document.getElementById("export-file").disabled = tracks.length === 0;
}
updateButtons();

document.getElementById("adv1").addEventListener("change", (e) => {
    renderPlaylist();
});
document.getElementById("adv2").addEventListener("change", (e) => {
    renderPlaylist();
});
async function exportFile() {
    let name = prompt("Name of your .splbee file:");
    if (name === null) {
        return;
    }
    try {
        const zip = new JSZip();
        const audioFolder = zip.folder("audio");
        const manifest = {
            format: "spelling-bee",
            version: 2,
            settings: {
                case: document.getElementById("case").checked,
                adv1: document.getElementById("adv1").checked,
                adv2: document.getElementById("adv2").checked
            },
            tracks: []
        };
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
                partOfSpeech: track.partOfSpeech,
                def: track.definition
            });
        }
        zip.file("manifest.json", JSON.stringify(manifest, "\n", 4));
        const zipBlob = await zip.generateAsync({
            type: "blob"
        });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        name = !name ? "unnamed" : name;
        link.download = name + ".splbee";
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
