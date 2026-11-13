import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const WORKER_URL = "https://respeak-transcription.sophiesara213.workers.dev/";

// VIDEO ELEMENTS
const videoUpload = document.getElementById("videoUpload");
const videoPreview = document.getElementById("videoPreview");
const videoInfo = document.getElementById("videoInfo");

// AUDIO UPLOAD ELEMENTS
const audioUpload = document.getElementById("audioUpload");
const audioFileName = document.getElementById("audioFileName");
const transcribeButton = document.getElementById("transcribeButton");
const transcriptionStatus = document.getElementById("transcriptionStatus");

// DIALOGUE ELEMENTS
const dialogue = document.getElementById("dialogue");
const replacement = document.getElementById("replacement");
const saveDialogue = document.getElementById("saveDialogue");
const saveStatus = document.getElementById("saveStatus");

// SPEECH GENERATION ELEMENTS
const voiceSelect = document.getElementById("voiceSelect");
const generateSpeechButton = document.getElementById("generateSpeechButton");
const speechStatus = document.getElementById("speechStatus");
const generatedAudioSection = document.getElementById("generatedAudioSection");
const generatedAudio = document.getElementById("generatedAudio");
const downloadSpeech = document.getElementById("downloadSpeech");

// FFMPEG ELEMENTS
const loadFFmpegButton = document.getElementById("loadFFmpeg");
const ffmpegStatus = document.getElementById("ffmpegStatus");

// AUDIO EXTRACTION ELEMENTS
const extractAudioButton = document.getElementById("extractAudioButton");
const extractAudioStatus = document.getElementById("extractAudioStatus");
const extractedAudioSection = document.getElementById("extractedAudioSection");
const extractedAudio = document.getElementById("extractedAudio");
const downloadExtractedAudio = document.getElementById("downloadExtractedAudio");
const transcribeExtractedAudio = document.getElementById("transcribeExtractedAudio");

// APPLICATION STATE
let currentVideoURL = null;
let generatedAudioURL = null;
let extractedAudioURL = null;
let currentVideoName = "";
let currentVideoFile = null;

const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;


// VIDEO UPLOAD AND PREVIEW
videoUpload.addEventListener("change", function () {
    const file = this.files && this.files[0];

    if (!file) {
        videoInfo.textContent = "No video uploaded yet.";
        return;
    }

    if (!file.type.startsWith("video/")) {
        videoInfo.textContent = "Please select a valid video file.";
        return;
    }

    if (currentVideoURL) {
        URL.revokeObjectURL(currentVideoURL);
    }

    // Clear previously extracted audio
    if (extractedAudioURL) {
        URL.revokeObjectURL(extractedAudioURL);
        extractedAudioURL = null;
    }

    extractedAudio.pause();
    extractedAudio.removeAttribute("src");
    extractedAudio.load();

    extractedAudioSection.hidden = true;
    extractAudioStatus.textContent = "";

    currentVideoFile = file;
    currentVideoURL = URL.createObjectURL(file);
    currentVideoName = file.name;

    videoPreview.pause();
    videoPreview.src = currentVideoURL;
    videoPreview.hidden = false;

    videoInfo.textContent =
        "Selected: " + file.name + ". Loading preview...";

    videoPreview.onloadedmetadata = function () {
        const duration = Math.round(videoPreview.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        videoInfo.textContent =
            "File: " + file.name +
            " | Size: " + (file.size / (1024 * 1024)).toFixed(2) + " MB" +
            " | Duration: " + minutes + ":" +
            String(seconds).padStart(2, "0") +
            " | Resolution: " +
            videoPreview.videoWidth + " × " + videoPreview.videoHeight;
    };

    videoPreview.onerror = function () {
        videoInfo.textContent =
            "The video was selected, but this format could not be played. Try another video.";
    };

    videoPreview.load();

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
audioUpload.addEventListener("change", function () {
    const file = this.files[0];

    audioFileName.textContent = file
        ? "Selected audio: " + file.name
        : "No audio file selected.";

    transcriptionStatus.textContent = "";
});


// AUDIO TRANSCRIPTION
transcribeButton.addEventListener("click", async function () {
    const file = audioUpload.files[0];

    if (!file) {
        transcriptionStatus.textContent =
            "Please select an audio file first.";
        return;
    }

    if (file.size > 25 * 1024 * 1024) {
        transcriptionStatus.textContent =
            "The audio file is too large. Maximum size is 25 MB.";
        return;
    }

    const formData = new FormData();
    formData.append("audio", file);

    transcribeButton.disabled = true;
    transcriptionStatus.textContent =
        "Uploading audio. Please wait...";

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
saveDialogue.addEventListener("click", function () {
    if (!currentVideoName) {
        saveStatus.textContent =
            "Upload a video before saving dialogue.";
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

    saveStatus.textContent =
        "Dialogue saved successfully.";
});


// GENERATE REPLACEMENT SPEECH
generateSpeechButton.addEventListener("click", async function () {
    const text = replacement.value.trim();
    const speaker = voiceSelect.value;

    if (!text) {
        speechStatus.textContent =
            "Please enter your replacement dialogue first.";
        return;
    }

    if (text.length > 2000) {
        speechStatus.textContent =
            "Your replacement dialogue must be 2,000 characters or fewer.";
        return;
    }

    generateSpeechButton.disabled = true;

    speechStatus.textContent =
        "Generating replacement speech. Please wait...";

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
            throw new Error(
                "The speech service returned an empty audio file."
            );
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


// FFMPEG VIDEO PROCESSING ENGINE
loadFFmpegButton.addEventListener("click", async function () {
    if (ffmpegLoaded) {
        ffmpegStatus.textContent =
            "Video processing engine is already loaded.";
        return;
    }

    loadFFmpegButton.disabled = true;

    ffmpegStatus.textContent =
        "Downloading FFmpeg. This may take a few minutes...";

    try {
        const baseURL =
            "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

        ffmpeg.on("log", ({ message }) => {
            console.log("FFmpeg:", message);
        });

        const coreURL = await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
        );

        const wasmURL = await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
        );

        await ffmpeg.load({
            coreURL,
            wasmURL
        });

        ffmpegLoaded = true;

        loadFFmpegButton.textContent = "Video Engine Ready";

        ffmpegStatus.textContent =
            "FFmpeg loaded successfully. Video processing engine is ready.";

    } catch (error) {
        console.error("Full FFmpeg error:", error);

        const details =
            error?.message || error?.stack || String(error);

        ffmpegStatus.textContent =
            "FFmpeg loading failed: " + details;

        loadFFmpegButton.disabled = false;
    }
});


// EXTRACT ORIGINAL AUDIO FROM VIDEO
extractAudioButton.addEventListener("click", async function () {
    if (!currentVideoFile) {
        extractAudioStatus.textContent =
            "Please upload a video first.";
        return;
    }

    if (!ffmpegLoaded) {
        extractAudioStatus.textContent =
            "Please load the Video Processing Engine first.";
        return;
    }

    extractAudioButton.disabled = true;

    extractAudioStatus.textContent =
        "Extracting audio from your video. Please wait...";

    extractedAudioSection.hidden = true;

    let inputName = "";
    const outputName = "extracted-audio.m4a";

    try {
        const extension =
            currentVideoFile.name.split(".").pop().toLowerCase();

        const safeExtension =
            /^[a-z0-9]{1,8}$/.test(extension) ? extension : "mp4";

        inputName = "input-video." + safeExtension;

        // Read the uploaded video into FFmpeg
        const videoData = new Uint8Array(
            await currentVideoFile.arrayBuffer()
        );

        await ffmpeg.writeFile(inputName, videoData);

        extractAudioStatus.textContent =
            "Processing video and extracting its audio...";

        // Extract audio and convert it to a compact M4A file
        const exitCode = await ffmpeg.exec([
            "-i", inputName,
            "-vn",
            "-c:a", "aac",
            "-b:a", "96k",
            "-y",
            outputName
        ]);

        if (exitCode !== 0) {
            throw new Error("FFmpeg could not extract the audio.");
        }

        const audioData = await ffmpeg.readFile(outputName);

        if (!audioData || audioData.length === 0) {
            throw new Error("The extracted audio file is empty.");
        }

        const audioBlob = new Blob(
            [audioData],
            { type: "audio/mp4" }
        );

        if (extractedAudioURL) {
            URL.revokeObjectURL(extractedAudioURL);
        }

        extractedAudioURL = URL.createObjectURL(audioBlob);

        extractedAudio.src = extractedAudioURL;
        downloadExtractedAudio.href = extractedAudioURL;
        downloadExtractedAudio.download = "extracted-audio.m4a";

        extractedAudioSection.hidden = false;

        extractAudioStatus.textContent =
            "Audio extracted successfully. You can listen to or download it below.";

    } catch (error) {
        console.error("Audio extraction error:", error);

        extractAudioStatus.textContent =
            "Audio extraction failed: " +
            (error?.message || String(error));

    } finally {
        // Remove temporary FFmpeg files
        try {
            if (inputName) {
                await ffmpeg.deleteFile(inputName);
            }
        } catch (error) {
            console.warn("Temporary input cleanup:", error);
        }

        try {
            await ffmpeg.deleteFile(outputName);
        } catch (error) {
            // Output may not exist if extraction failed.
        }

        extractAudioButton.disabled = false;
    }
});


// TRANSCRIBE EXTRACTED AUDIO
transcribeExtractedAudio.addEventListener("click", async function () {
    if (!extractedAudioURL) {
        extractAudioStatus.textContent =
            "Extract audio from your video first.";
        return;
    }

    transcribeExtractedAudio.disabled = true;

    extractAudioStatus.textContent =
        "Sending extracted audio for transcription...";

    try {
        const responseBlob = await fetch(extractedAudioURL);
        const audioBlob = await responseBlob.blob();

        if (audioBlob.size > 25 * 1024 * 1024) {
            throw new Error(
                "The extracted audio is larger than 25 MB. Try a shorter video."
            );
        }

        const audioFile = new File(
            [audioBlob],
            "extracted-audio.m4a",
            { type: "audio/mp4" }
        );

        const formData = new FormData();
        formData.append("audio", audioFile);

        const response = await fetch(WORKER_URL, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Transcription failed."
            );
        }

        dialogue.value = result.transcript || "";

        extractAudioStatus.textContent =
            "Transcription completed. Your video's dialogue is now in the Original Dialogue box.";

    } catch (error) {
        console.error("Extracted audio transcription error:", error);

        extractAudioStatus.textContent =
            "Transcription error: " +
            (error?.message || String(error));

    } finally {
        transcribeExtractedAudio.disabled = false;
    }
});


// CLEAN UP TEMPORARY FILE URLS
window.addEventListener("beforeunload", function () {
    if (currentVideoURL) {
        URL.revokeObjectURL(currentVideoURL);
    }

    if (generatedAudioURL) {
        URL.revokeObjectURL(generatedAudioURL);
    }

    if (extractedAudioURL) {
        URL.revokeObjectURL(extractedAudioURL);
    }
});
