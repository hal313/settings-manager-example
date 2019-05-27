/**
 * Gets the type of an object.
 *
 * This is a huge hack because Babel seems to have issues with typeof in some cases.
 *
 * @param {*} the thing to get the type of
 * @returns {string} a string which defines the type
 */
export function getType(o) {
    return typeof(o);
}

/**
 * Tests to see if a candidate is a function.
 *
 * @param {*} candidate the candidate to test
 * @returns {boolean} true if candidate is a function; false otherwise
 */
export function isFunction(candidate) {
    return 'function' === getType(candidate) || candidate instanceof Function;
};

/**
 * Tests to see if a candidate is an object.
 *
 * @param {*} candidate the candidate to test
 * @returns {boolean} true if candidate is an object; false otherwise
 */
export function isObject(candidate) {
    return 'object' === getType(candidate);
}

/**
 * Executes a function with the specified parameters and context.
 *
 * @param {Function} fn the function to execute
 * @param {[*]} [args] the arguments
 * @param {object} [context] the context to run the function with
 */
export function execute(fn, args, context) {
    if (isFunction(fn)) {
        return fn.apply(context || {}, args);
    }
    return null;
}

// Names of functions defined by Object
const OBJECT_PROTOTYPE_FUNCTION_NAMES = Object.getOwnPropertyNames(Object.getPrototypeOf(new Object()));

/**
 * Gets the names of all functions (other than functions defined on Object), defined and inherited.
 *
 * @param {Object} target the object to get all function names from, defined in inherited
 * @returns {String[]} names of defined functions
 */
export function getAllFunctionNames(target) {
    let functionNames = [];

    if (!!target && isObject(target)) {
        do {
            Object.getOwnPropertyNames(target)
                .filter(name => !!(target[name]))
                .filter(name => isFunction(target[name]))
                .filter(name => !OBJECT_PROTOTYPE_FUNCTION_NAMES.includes(name))
                .filter(name => !functionNames.includes(name))
                .forEach(name => functionNames.push(name));
        } while (target = Object.getPrototypeOf(target));
    }

    return functionNames.sort()
}

/**
 * Promiseifies a function or every function on a target. If the target is an object, all functions will be promiseified.
 *
 * Options:
 *  only: String[]
 *  include: String[]
 *  exclude: String[]
 *
 * If 'only' is specified, then exactly those functions will be promisieifed
 * If 'include' is specified, then those functions will be promisified, unless explicitly overriden by 'exclude'
 * If 'exclude' is specified, then those functions will NOT be promisified; ignored when 'only' is specified
 * The default behavior is to promiseify all functions (except those defined on Object).
 *
 * @param {Function|Object} target the function or object to promiseify
 * @param {Object} [options] the optional options for promiseification
 * @returns {Function|Object} the promiseified target
 */
export function Promiseify(target, options) {
    // Invoke the work function
    return doPromiseify(target, options, null);
}

/**
 * Promiseifies a function or every function on a target. If the target is an object, all functions will be promiseified.
 *
 * Options:
 *  only: String[]
 *  include: String[]
 *  exclude: String[]
 *
 * If 'only' is specified, then exactly those functions will be promisieifed
 * If 'include' is specified, then those functions will be promisified, unless explicitly overriden by 'exclude'
 * If 'exclude' is specified, then those functions will NOT be promisified; ignored when 'only' is specified
 * The default behavior is to promiseify all functions (except those defined on Object).
 *
 * @param {Function|Object} target the function or object to promiseify
 * @param {Object} [options] the optional options for promiseification
 * @param {Object} [context] the context (parent object of functions) to use when applying functions
 * @returns {Function|Object} the promiseified target
 */
function doPromiseify(target, options, context) {

    // Normalize the options
    options = options || {};

    if (isFunction(target)) {
        return function() {
            // if arguments.length = 0
            //  no success handler
            // if arguments.length = 1
            //  if (args[0]) is a function
            //    assume success handler
            //  else
            //    no success handler
            // if right-most is a function AND (right-most - 1) is also a function
            //  assume success and error
            // if right-most is a function AND (right-most - 1) is not a function
            //  assume only success
            // else
            //  no handlers

            // Handlers (no-op, by default)
            let successHandler;
            let failureHandler;

            // Args for the function execution; this will not include callbacks after processing
            let executionArguments = Array.from(arguments);

            // Separate the arguments from the callbacks:
            //   -executionArguments will be the pure arguments
            //   -successHandler will be a wrapped handler
            //   -failureHandler will be a wrapped handler
            if (0 === arguments.length) {
                // No handlers passed in; no need to change handlers or args
            } if (1 === arguments.length) {
                // Evaluate the sole argument
                //
                if (isFunction(arguments[0])) {
                    // If one arg is passed in and it is a function, consider it a success function
                    //
                    // Assign the success handler
                    successHandler = arguments[0];

                    // Remove any arguments
                    executionArguments = [];
                } else {
                    // No success handler; no need to change handlers or args
                }
            } else {
                // More than 1 arguments are passed in
                //
                if (isFunction(arguments[arguments.length-1]) && isFunction(arguments[arguments.length-2])) {
                    // If both of the last two arguments are functions,
                    //  -assign the success and failure handlers
                    successHandler = arguments[arguments.length-2];
                    failureHandler = arguments[arguments.length-1];
                    //
                    //  -remove the last two arguments from args
                    executionArguments = executionArguments.slice(0, executionArguments.length-2);
                } else if (isFunction(arguments[arguments.length-1])) {
                    // If only the last argument is a function,
                    //  -assign the success handler only
                    successHandler = arguments[arguments.length-1];
                    //
                    //  -remove the last argument from args
                    executionArguments = executionArguments.slice(0, executionArguments.length-1);
                }
                else {
                    // No callbacks passed in; no need to change args or callbacks
                }
            }

            // Return a promise
            //
            // It is the responsibility of the function implementation to invoke the callbacks!
            return new Promise((resolve, reject) => {

                /**
                 * Executes the success handlers (invokes the callback and resolves the promise).
                 *
                 * @param {*[]} executionArgs arguments to pass to the handlers
                 */
                function executeSuccess(executionArgs) {
                    execute(successHandler, executionArgs);
                    resolve(executionArgs);
                }

                /**
                 * Executes the failure handlers (invokes the callback rejects the promise).
                 *
                 * @param {*[]} executionArgs arguments to pass to the handlers
                 */
                function executeFailure(executionArgs) {
                    execute(failureHandler, executionArgs);
                    reject(executionArgs);
                }

                // Push the success handler onto args
                executionArguments.push(function onSuccessPromiseified() {
                    // Get the arguments
                    let executionArgs = Array.from(arguments);

                    // Be sure that the outcome redirector is defined
                    options.outcomeRedirector = options.outcomeRedirector || function trueRedirector() { return true; };

                    // Execute and dispatch
                    !!execute(options.outcomeRedirector, executionArgs) ? executeSuccess(executionArgs) : executeFailure(executionArgs);
                });

                // Push the failure handler onto args
                executionArguments.push(function onErrorPromiseified() {
                    // Get the arguments
                    let executionArgs = Array.from(arguments);

                    // Be sure that the outcome redirector is defined
                    options.outcomeRedirector = options.outcomeRedirector || function falseRedirector() { return false; };

                    // Execute and dispatch
                    !!execute(options.outcomeRedirector, executionArgs) ? executeSuccess(executionArgs) : executeFailure(executionArgs);
                });

                // Execute the function (throwing will reject the promise with the error)
                target.apply(context, executionArguments);
            });
        }
    } else if (isObject(target)) {
        let promisifiedObject = target;
        // Start with ALL functions on the target
        let targetFunctions = getAllFunctionNames(target);

        // Handle the case where 'only' is specified
        if (!!options.only) {
            targetFunctions = options.only;
        } else {
            if (!!options.include) {
                // Start from a clean slate
                targetFunctions = [];
                options.include.forEach(name => {
                    if (!targetFunctions.includes(name) && isFunction(promisifiedObject[name])) {
                        targetFunctions.push(name);
                    }
                });
            }
            // Now, remove any exclusions
            if (!!options.exclude) {
                options.exclude.forEach(name => {
                    targetFunctions = targetFunctions.filter(candidate => {
                        return candidate !== name;
                    });
                });
            }
        }

        // Promiseify the functions
        targetFunctions.forEach((name) => {
            if (isFunction(promisifiedObject[name])) {
                promisifiedObject[name] = doPromiseify(promisifiedObject[name], options, target);
            }
        });
        return promisifiedObject;
    } else {
        throw 'Cannot promiseify type: ' + getType(target);
    }

}

/**
 * Creates a function which will override any outcomeRedirector in options with the
 * optionsRedirector passed in.
 *
 * @param {Object|Function} target the object or function to promiseify
 * @param {Object} [options] options to pass to the processor
 * @param {Function} outcomeRedirector the outcome redirector to use
 */
function buildWithOutcomeRedirector(target, options, outcomeRedirector) {
    options = options || {};
    options.outcomeRedirector = outcomeRedirector;
    return Promiseify(target, options);
}

/**
 * Node-style promiseification. Single callback, error first.
 *
 * function callback(error, [...]);
 */
Promiseify.nodeStyle = (target, options) => buildWithOutcomeRedirector(target, options, error => !error);

/**
 * Chrome runtime API promiseification. Single callback, global failure indicator (chrome.runtime.lastError).
 */
Promiseify.chromeRuntimeAPIStyle = (target, options) => buildWithOutcomeRedirector(target, options, () => {
    if (window.chrome && window.chrome.runtime) {
        return undefined === window.chrome.runtime.lastError || null === window.chrome.runtime.lastError;
    }
    // Assume success (the variable was not present, most likely)
    return true;
});
