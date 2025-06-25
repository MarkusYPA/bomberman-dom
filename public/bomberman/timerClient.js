
// alternative to setTimeout() with pause, resume and cancel
export class Timer {
    constructor(callback, delay) {
        let timerId, start, remaining = delay;

        this.pause = function () {
            window.clearTimeout(timerId);
            timerId = null;
            remaining -= Date.now() - start;
        };

        this.resume = function () {
            if (timerId) {
                return;
            }
            start = Date.now();
            timerId = window.setTimeout(callback, remaining);
        };

        this.cancel = function () {
            window.clearTimeout(timerId);
            timerId = null;
        };

        this.resume();
    };
};
