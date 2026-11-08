"use strict";

const videoUpload = document.getElementById("videoUpload");
const videoPreview = document.getElementById("videoPreview");
const videoInfo = document.getElementById("videoInfo");
const dialogue = document.getElementById("dialogue");
const replacement = document.getElementById("replacement");
const saveDialogue = document.getElementById("saveDialogue");
const saveStatus = document.getElementById("saveStatus");

let currentVideoURL = null;
let currentVideoName = null;

// Format file size
function formatFileSize(bytes) {
    const units = ["Bytes", "KB", "MB", "GB"];
    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }

    return `${size.toFixed(2)} ${units[index]}`;
}

// Upload and preview video
videoUpload.addEventListener("change", function(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
        alert("Please select a valid video file.");
        videoUpload.value = "";
        return;
    }

    // Release the previous video URL
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

    // Restore saved dialogue for this video
    const savedData = getSavedDialogue(file.name);

    dialogue.value = savedData.original || "";
    replacement.value = savedData.replacement || "";

    saveStatus.textContent = "";
});

// Store dialogue locally in the browser
function getSavedDialogue(videoName) {
    try {
        return JSON.parse(
            localStorage.getItem("respeak_" + videoName)
        ) || {};
    } catch (error) {
        return {};
    }
}

// Save dialogue
saveDialogue.addEventListener("click", function() {
    if (!currentVideoName) {
        saveStatus.textContent =
            "Please upload a video first.";
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

// Warn before leaving with an unsaved video session
window.addEventListener("beforeunload", function() {
    if (currentVideoURL) {
        URL.revokeObjectURL(currentVideoURL);
    }
});

console.log("ReSpeak Studio editor initialized.");
