/**
 * Determines if a value is a function.
 *
 * @param {*} candidate the candidate to test
 * @returns {boolean} true, if candidate is a Function
 */
export function isFunction(candidate) {
    return 'function' === typeof candidate;
}

/**
 * Determines if a value is an object.
 *
 * @param {*} candidate the candidate to test
 * @returns {boolean} true, if candidate is an object
 */
export function isObject(candidate) {
    return null !== candidate && 'object' === typeof candidate && !isArray(candidate);
}

/**
 * Determines if a value is an array.
 *
 * @param {*} candidate the candidate to test
 * @returns {boolean} true, if candidate is an array
 */
export function isArray(candidate) {
    return Array.isArray(candidate);
}

/**
 * Merges two objects; members of the second object take precedence over the first object.
 *
 * @param {Object} target an object to merge to
 * @returns {Object} the target object, populated with the source object's members
 */
export function merge(target, source) {
    // Merge algorithm adapted from:
    // From (http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically)

    let array = isArray(source),
        dest = array && [] || {};

    if (array) {
        target = target || [];
        dest = dest.concat(target);
        source.forEach(function onItem(e, i) {
            if ('undefined' === typeof dest[i]) {
                dest[i] = e;
            } else if ('object' === typeof e) {
                dest[i] = merge(target[i], e);
            } else {
                if (target.indexOf(e) === -1) {
                    dest.push(e);
                }
            }
        });
    } else {
        if (isObject(target)) {
            Object.keys(target || {}).forEach(function (key) {
                dest[key] = target[key];
            });
        }
        Object.keys(source || {}).forEach(function (key) {
            if (!isObject(source[key]) || !source[key]) {
                dest[key] = source[key];
            }
            else {
                if (!target[key]) {
                    dest[key] = source[key];
                } else {
                    dest[key] = merge(target[key], source[key]);
                }
            }
        });
    }

    return dest;
}

/**
 * Executes a function.
 *
 * @param {Function} fn the function to execute
 * @param {*[]} args an array of arguments to execute the function with
 * @param {Object} [context] the optional context
 * @returns {*} the return value of the function execution, or null if no function is provided
 */
export function execute(fn, args, context) {
    if (isFunction(fn)) {
        return fn.apply(context || {}, args);
    }
    return null;
}

/**
 * Executes a function asynchronously.
 *
 * @param {Function} fn the function to execute
 * @param {*[]} args an array of arguments to execute the function with
 * @param {Object} [context] the optional context
 */
export function executeAsync(fn, args, context) {
    if (isFunction(fn)) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve(fn.apply(context || {}, args));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
    return null;
}

/**
 * A store implementation in memory.
 */
export class InMemoryStore {

    //this.settings = {};

    /**
     * Creates an instance.
     */
    constructor() {
        this.settings = {};
    }

    /**
     * Loads values.
     *
     * @param {Function} successCallback the callback invoked on success (with parameter {})
     */
    load(successCallback) {
        executeAsync(successCallback, [merge({}, this.settings)]);
    };

    /**
     * Saves values.
     *
     * @param {Object} settings the settings to save
     * @param {Function} successCallback the success callback to invoke on success
     */
    save(settings, successCallback) {
        // Assign the settings
        this.settings = merge(this.settings, settings);

        // Invoke the callback
        executeAsync(successCallback, [merge({}, this.settings)]);
    };

    /**
     * Clears values.
     *
     * @param {Function} successCallback the success callback to invoke on success
     */
    clear(successCallback) {
        this.settings = {};

        executeAsync(successCallback, [{}]);
    };

};

/**
 * Implementation for SettingsManager, a class for storing settings.
 *
 * @param {Object} [backingStore] optional backing store to wrap
 */
export class SettingsManager {

    /**
     * Creates a SettingsManager instance backed by an optional store.
     *
     * @param {Store} [backingStore] optional store implementation to use
     */
    constructor(backingStore) {
        this.backingStore = backingStore || new InMemoryStore();
    }

    /**
     * Loads values.
     *
     * @param {Function} [successCallback] the callback invoked on success (invoked with the settings)
     * @param {Function} [errorCallback] the error callback, invoked on failure
     */
    load(successCallback, errorCallback) {
        this.backingStore.load(function onLoad(settings) {
            execute(successCallback, [settings], this.backingStore);
        }, errorCallback);
    };

    /**
     * Saves values.
     *
     * @param {Object} settings the settings to save
     * @param {Function} [successCallback] the callback invoked on success
     * @param {Function} [errorCallback] the error callback, invoked on failure
     */
    save(settings, successCallback, errorCallback) {
        if (!settings) {
            executeAsync(successCallback, [{}]);
        } else if (isObject(settings)) {
            execute(this.backingStore.save, [settings, successCallback, errorCallback], this.backingStore);
        } else {
            executeAsync(errorCallback, ['"settings" is not an object']);
        }
    };

    /**
     * Clears values.
     *
     * @param {Function} successCallback the success callback to invoke on success
     * @param {Function} [errorCallback] the error callback, invoked on failure
     */
    clear(successCallback, errorCallback) {
        executeAsync(this.backingStore.clear, [successCallback, errorCallback], this.backingStore);
    };

}
