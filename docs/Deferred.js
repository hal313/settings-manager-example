/**
 * A simple implementation of the Deferred pattern. Used to easily be notified when both implementations finish execution.
 */
export class Deferred {
    promise = undefined;
    done = undefined;
    error = undefined;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.done = resolve;
            this.error = reject;
        });
    }

};