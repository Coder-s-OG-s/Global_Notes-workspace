
const $ = (selector) => document.querySelector(selector);

export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;

        this.startBtn = $('#start-record-btn');
        this.stopBtn = $('#stop-record-btn');
        this.saveBtn = $('#save-audio-btn');
        this.statusEl = $('#audio-status');
        this.visualizer = $('#audio-visualizer');

        this.audioBlob = null;
        this.audioUrl = null;

        this.init();
    }

    init() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.addEventListener("dataavailable", (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.addEventListener("stop", () => {
                this.audioBlob = new Blob(this.audioChunks, { type: "audio/mp3" }); // or audio/webm
                this.audioUrl = URL.createObjectURL(this.audioBlob);
                this.statusEl.textContent = "Recording saved. Ready to insert.";
                this.saveBtn.disabled = false;

                // Stop all tracks to release mic
                this.stream.getTracks().forEach(track => track.stop());
            });

            this.mediaRecorder.start();
            this.updateUI(true);
            this.statusEl.textContent = "Recording...";

        } catch (err) {
            console.error("Error accessing microphone:", err);
            this.statusEl.textContent = "Error: Could not access microphone.";
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.updateUI(false);
        }
    }

    updateUI(isRecording) {
        this.startBtn.disabled = isRecording;
        this.stopBtn.disabled = !isRecording;
        if (isRecording) {
            this.visualizer.classList.add('recording');
            this.saveBtn.disabled = true;
        } else {
            this.visualizer.classList.remove('recording');
        }
    }

    getAudioUrl() {
        return this.audioUrl;
    }
}
