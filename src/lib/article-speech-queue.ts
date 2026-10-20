import { chunkSpeechText } from "./speech-text";

export type SpeechState = { status: "idle" | "playing" | "paused" | "error" | "complete"; completed: number; total: number; error: string };
export const INITIAL_SPEECH_STATE: SpeechState = { status: "idle", completed: 0, total: 0, error: "" };
type Timer = ReturnType<typeof setTimeout>;
export type SpeechEnvironment = {
    synth: Pick<SpeechSynthesis, "speak" | "cancel" | "resume" | "getVoices" | "speaking" | "paused">;
    utterance: (text: string) => SpeechSynthesisUtterance;
    later: (callback: () => void, delay: number) => Timer;
    clear: (timer: Timer) => void;
    now: () => number;
    hidden: () => boolean;
};

/** Exactly one live utterance. Only onend acknowledges a completed chunk. */
export class ArticleSpeechQueue {
    private chunks: string[] = [];
    private index = 0;
    private failures = 0;
    private generation = 0;
    private running = false;
    private disposed = false;
    private active: SpeechSynthesisUtterance | null = null;
    private nextTimer: Timer | null = null;
    private watchdog: Timer | null = null;
    private lastActivity = 0;
    private started = false;

    constructor(private env: SpeechEnvironment, private notify: (state: SpeechState) => void) { }

    start(text: string) {
        this.invalidate();
        this.chunks = chunkSpeechText(text);
        this.index = 0;
        this.failures = 0;
        if (!this.chunks.length || this.disposed) return;
        this.running = true;
        this.report("playing");
        this.speak(); // Keep first speak inside user gesture, especially iOS.
    }

    pause() {
        if (!this.running) return;
        this.invalidate();
        this.report("paused");
    }

    resume() {
        if (this.disposed || this.running || this.index >= this.chunks.length) return;
        this.failures = 0;
        this.running = true;
        this.report("playing");
        this.speak();
    }

    visibilityChanged() {
        if (!this.running) return;
        this.clearWatchdog();
        if (this.env.hidden()) return;
        this.lastActivity = this.env.now();
        if (this.env.synth.paused) this.env.synth.resume();
        if (!this.env.synth.speaking && this.active) this.retry();
        else this.watch();
    }

    dispose() { this.disposed = true; this.invalidate(); }

    private report(status: SpeechState["status"], error = "") {
        if (!this.disposed) this.notify({ status, completed: this.index, total: this.chunks.length, error });
    }

    private clearWatchdog() {
        if (this.watchdog !== null) this.env.clear(this.watchdog);
        this.watchdog = null;
    }

    private invalidate() {
        this.running = false;
        this.generation++;
        this.clearWatchdog();
        if (this.nextTimer !== null) this.env.clear(this.nextTimer);
        this.nextTimer = null;
        if (this.active) {
            this.active.onend = null;
            this.active.onerror = null;
            this.active.onstart = null;
            this.active.onboundary = null;
        }
        this.active = null;
        this.env.synth.cancel();
    }

    private speak() {
        if (!this.running || this.disposed) return;
        if (this.index >= this.chunks.length) {
            this.running = false;
            this.clearWatchdog();
            this.report("complete");
            return;
        }
        const token = ++this.generation;
        const utterance = this.env.utterance(this.chunks[this.index]);
        this.active = utterance; // Strong reference prevents browser GC dropping end events.
        this.started = false;
        this.lastActivity = this.env.now();
        utterance.lang = "id-ID";
        utterance.rate = .98;
        const voices = this.env.synth.getVoices();
        const voice = voices.find(item => /^id(?:-|_)/i.test(item.lang) && /google/i.test(item.name))
            || voices.find(item => /^id(?:-|_|$)/i.test(item.lang));
        if (voice) utterance.voice = voice;
        const valid = () => this.running && !this.disposed && token === this.generation && this.active === utterance;
        utterance.onstart = () => { if (valid()) { this.started = true; this.lastActivity = this.env.now(); } };
        utterance.onboundary = () => { if (valid()) this.lastActivity = this.env.now(); };
        utterance.onend = () => {
            if (!valid()) return;
            this.generation++;
            this.clearWatchdog();
            this.active = null;
            this.index++;
            this.failures = 0;
            this.report("playing");
            this.nextTimer = this.env.later(() => { this.nextTimer = null; this.speak(); }, 70);
        };
        utterance.onerror = () => { if (valid()) this.retry(); };
        try {
            if (this.env.synth.paused) this.env.synth.resume();
            this.env.synth.speak(utterance);
            this.watch();
        } catch { if (valid()) this.retry(); }
    }

    private retry() {
        const failures = this.failures + 1;
        this.invalidate();
        this.failures = failures;
        if (failures > 2) {
            this.report("error", "Suara belum dapat melanjutkan. Tekan Coba lagi; bagian terakhir tidak dilewati.");
            return;
        }
        this.running = true;
        this.nextTimer = this.env.later(() => { this.nextTimer = null; this.speak(); }, 250 * failures);
    }

    private watch() {
        this.clearWatchdog();
        if (!this.running || !this.active || this.env.hidden()) return;
        this.watchdog = this.env.later(() => {
            this.watchdog = null;
            if (!this.running || !this.active || this.env.hidden()) return;
            if (this.env.synth.paused) this.env.synth.resume();
            const timeout = this.started ? 25000 : 8000;
            if (this.env.now() - this.lastActivity >= timeout) this.retry();
            else this.watch();
        }, 2000);
    }
}
