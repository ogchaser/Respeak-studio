“use strict”;

const videoUpload = document.getElementById(“videoUpload”);
const videoPreview = document.getElementById(“videoPreview”);
const videoInfo = document.getElementById(“videoInfo”);
const dialogue = document.getElementById(“dialogue”);
const replacement = document.getElementById(“replacement”);
const saveDialogue = document.getElementById(“saveDialogue”);
const saveStatus = document.getElementById(“saveStatus”);

const audioUpload = document.getElementById(“audioUpload”);
const transcribeButton = document.getElementById(“transcribeButton”);
const transcriptionStatus = document.getElementById(“transcriptionStatus”);

const WORKER_URL =
“https://respeak-transcription.sophiesara213.workers.dev/”;

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

let currentVideoURL = null;
let currentVideoName = null;

// Format file size
function formatFileSize(bytes) {
const units = [“Bytes”, “KB”, “MB”, “GB”];
let size = bytes;
let index = 0;

while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
}
return `${size.toFixed(2)} ${units[index]}`;

}

// Upload and preview video
videoUpload.addEventListener(“change”, function(event) {
const file = event.target.files[0];

if (!file) return;
if (!file.type.startsWith("video/")) {
    alert("Please select a valid video file.");
    videoUpload.value = "";
    return;
}
if (currentVideoURL) {
    URL.revokeObjectURL(currentVideoURL);
}
currentVideoURL = URL.createObjectURL(file);
currentVideoName = file.name;
videoPreview.src = currentVideoURL;
videoPreview.hidden = false;
videoPreview.onloadedmetadata = function() {
    const duration = videoPreview.duration;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    videoInfo.textContent =
        `File: ${file.name} | Size: ${formatFileSize(file.size)} | Duration: ${minutes}:${String(seconds).padStart(2, "0")} | Resolution: ${videoPreview.videoWidth} × ${videoPreview.videoHeight}`;
};
videoPreview.onerror = function() {
    videoInfo.textContent =
        "This video format could not be previewed by your browser.";
};
videoInfo.textContent = "Loading video preview...";
const savedData = getSavedDialogue(file.name);
dialogue.value = savedData.original || "";
replacement.value = savedData.replacement || "";
saveStatus.textContent = "";

};

// Restore saved dialogue
function getSavedDialogue(videoName) {
try {
return JSON.parse(
localStorage.getItem(“respeak_” + videoName)
) || {};
} catch (error) {
return {};
}
}

// Save dialogue
saveDialogue.addEventListener(“click”, function() {
if (!currentVideoName) {
saveStatus.textContent =
“Please upload a video first.”;
return;
}

const data = {
    original: dialogue.value,
    replacement: replacement.value,
    updatedAt: new Date().toISOString()
};
try {
    localStorage.setItem(
        "respeak_" + currentVideoName,
        JSON.stringify(data)
    );
    saveStatus.textContent =
        "Dialogue saved successfully in this browser.";
} catch (error) {
    saveStatus.textContent =
        "Unable to save. Your browser storage may be full.";
}

});

// Transcribe an uploaded audio file using Cloudflare Whisper
transcribeButton.addEventListener(“click”, async function() {

// Get the selected audio file
const audioFile = audioUpload.files[0];
if (!audioFile) {
    transcriptionStatus.textContent =
        "Please select an audio file first.";
    return;
}
if (audioFile.size > MAX_AUDIO_SIZE) {
    transcriptionStatus.textContent =
        "Audio file is too large. Maximum size is 25 MB.";
    return;
}
transcribeButton.disabled = true;
transcribeButton.textContent = "Transcribing...";
transcriptionStatus.textContent =
    "Uploading audio. Please wait...";
try {
    const formData = new FormData();
    formData.append("audio", audioFile, audioFile.name);
    const response = await fetch(WORKER_URL, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(
            result.error || "The transcription request failed."
        );
    }
    if (!result.transcript) {
        throw new Error(
            "The service responded, but no transcript was returned."
        );
    }
    // Display the recognized speech
    dialogue.value = result.transcript;
    transcriptionStatus.textContent =
        "Transcription completed successfully. Review your dialogue below.";
} catch (error) {
    console.error("Transcription error:", error);
    transcriptionStatus.textContent =
        "Transcription failed: " + error.message;
} finally {
    transcribeButton.disabled = false;
    transcribeButton.textContent = "Transcribe Audio";
}

});

// Release video memory when leaving the page
window.addEventListener(“beforeunload”, function() {
if (currentVideoURL) {
URL.revokeObjectURL(currentVideoURL);
}
});

console.log(“ReSpeak Studio editor initialized.”);
