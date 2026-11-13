const WORKER_URL = “https://respeak-transcription.sophiesara213.workers.dev/”;

const videoUpload = document.getElementById(“videoUpload”);
const videoPreview = document.getElementById(“videoPreview”);
const videoInfo = document.getElementById(“videoInfo”);

const audioUpload = document.getElementById(“audioUpload”);
const audioFileName = document.getElementById(“audioFileName”);
const transcribeButton = document.getElementById(“transcribeButton”);
const transcriptionStatus = document.getElementById(“transcriptionStatus”);

const dialogue = document.getElementById(“dialogue”);
const replacement = document.getElementById(“replacement”);
const saveDialogue = document.getElementById(“saveDialogue”);
const saveStatus = document.getElementById(“saveStatus”);

const voiceSelect = document.getElementById(“voiceSelect”);
const generateSpeechButton = document.getElementById(“generateSpeechButton”);
const speechStatus = document.getElementById(“speechStatus”);
const generatedAudioSection = document.getElementById(“generatedAudioSection”);
const generatedAudio = document.getElementById(“generatedAudio”);
const downloadSpeech = document.getElementById(“downloadSpeech”);

let currentVideoURL = null;
let generatedAudioURL = null;
let currentVideoName = “”;

// VIDEO UPLOAD AND PREVIEW
videoUpload.addEventListener(“change”, function () {
const file = this.files[0];

if (!file) return;
if (currentVideoURL) {
    URL.revokeObjectURL(currentVideoURL);
}
currentVideoURL = URL.createObjectURL(file);
currentVideoName = file.name;
videoPreview.src = currentVideoURL;
videoPreview.hidden = false;
videoInfo.textContent = "Loading video information...";
videoPreview.onloadedmetadata = function () {
    const duration = Math.round(videoPreview.duration);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    videoInfo.textContent =
        "File: " + file.name +
        " | Size: " + (file.size / (1024 * 1024)).toFixed(2) + " MB" +
        " | Duration: " + minutes + ":" + String(seconds).padStart(2, "0") +
        " | Resolution: " + videoPreview.videoWidth + " × " + videoPreview.videoHeight;
};
videoPreview.onerror = function () {
    videoInfo.textContent = "The selected video could not be played. Please try another video format.";
};
const savedData = localStorage.getItem("respeak_" + file.name);
if (savedData) {
    try {
        const data = JSON.parse(savedData);
        dialogue.value = data.original || "";
        replacement.value = data.replacement || "";
    } catch (error) {
        console.error("Could not restore saved dialogue:", error);
    }
} else {
    dialogue.value = "";
    replacement.value = "";
}
saveStatus.textContent = "";

});

// AUDIO FILE SELECTION
audioUpload.addEventListener(“change”, function () {
const file = this.files[0];

audioFileName.textContent = file
    ? "Selected audio: " + file.name
    : "No audio file selected.";
transcriptionStatus.textContent = "";

});

// AUDIO TRANSCRIPTION
transcribeButton.addEventListener(“click”, async function () {
const file = audioUpload.files[0];

if (!file) {
    transcriptionStatus.textContent = "Please select an audio file first.";
    return;
}
if (file.size > 25 * 1024 * 1024) {
    transcriptionStatus.textContent = "The audio file is too large. Maximum size is 25 MB.";
    return;
}
const formData = new FormData();
formData.append("audio", file);
transcribeButton.disabled = true;
transcriptionStatus.textContent = "Uploading audio. Please wait...";
try {
    const response = await fetch(WORKER_URL, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || "Transcription failed.");
    }
    dialogue.value = result.transcript || "";
    transcriptionStatus.textContent =
        "Transcription completed successfully. Review your dialogue below.";
} catch (error) {
    console.error("Transcription error:", error);
    transcriptionStatus.textContent =
        "Transcription error: " + error.message;
} finally {
    transcribeButton.disabled = false;
}

});

// SAVE DIALOGUE
saveDialogue.addEventListener(“click”, function () {
if (!currentVideoName) {
saveStatus.textContent = “Upload a video before saving dialogue.”;
return;
}

const data = {
    original: dialogue.value,
    replacement: replacement.value
};
localStorage.setItem(
    "respeak_" + currentVideoName,
    JSON.stringify(data)
);
saveStatus.textContent = "Dialogue saved successfully.";

});

// GENERATE REPLACEMENT SPEECH
generateSpeechButton.addEventListener(“click”, async function () {
const text = replacement.value.trim();
const speaker = voiceSelect.value;

if (!text) {
    speechStatus.textContent = "Please enter your replacement dialogue first.";
    return;
}
if (text.length > 2000) {
    speechStatus.textContent = "Your replacement dialogue must be 2,000 characters or fewer.";
    return;
}
generateSpeechButton.disabled = true;
speechStatus.textContent = "Generating replacement speech. Please wait...";
generatedAudioSection.hidden = true;
try {
    const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "generateSpeech",
            text: text,
            speaker: speaker
        })
    });
    if (!response.ok) {
        let errorMessage = "Speech generation failed.";
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (error) {
            // Keep the default error message.
        }
        throw new Error(errorMessage);
    }
    const audioBlob = await response.blob();
    if (!audioBlob.size) {
        throw new Error("The speech service returned an empty audio file.");
    }
    if (generatedAudioURL) {
        URL.revokeObjectURL(generatedAudioURL);
    }
    generatedAudioURL = URL.createObjectURL(audioBlob);
    generatedAudio.src = generatedAudioURL;
    downloadSpeech.href = generatedAudioURL;
    generatedAudioSection.hidden = false;
    speechStatus.textContent =
        "Speech generated successfully. You can listen to or download it below.";
} catch (error) {
    console.error("Speech generation error:", error);
    speechStatus.textContent =
        "Speech generation error: " + error.message;
} finally {
    generateSpeechButton.disabled = false;
}

});

// CLEAN UP TEMPORARY FILE URLS
window.addEventListener(“beforeunload”, function () {
if (currentVideoURL) {
URL.revokeObjectURL(currentVideoURL);
}

if (generatedAudioURL) {
    URL.revokeObjectURL(generatedAudioURL);
}

});
