import { Promiseify } from './Promiseifyish.es6.js';
import { SettingsManager } from './SettingsManager.es6.js';

import { Deferred } from './Deferred.js';
import { appendOperationToTextArea } from './helpers.js';

// IFEE
(function run() {

    // The text areas (used for output)
    let textAreas = {
        standard: document.getElementById('standard'),
        promisified: document.getElementById('promise')
    };

    // The deferreds, used for notification when both implementations have finished
    let deferreds = {
        standard: new Deferred(),
        promisified: new Deferred()
    };


    // This code demonstrates two functionally-identical uses of "settings-manager". The first example shows
    // the usage with the standard library. The second example shows how to write code which is easier to maintain
    // using the "promisifyish" library, which wraps all the "settings-manager" calls as promises.
    //
    // For each example, the code will::
    //  load the settings (which should be empty, initially)
    //  save some settings
    //  load the settings again (which should be the value we just saved)
    //  save some more settings
    //  load the settings again (which should be the value we just saved)
    //
    // Each method ("standard" and "promisified") exist in an IFEE in order to isolate variables. Both methods can use
    // the same variable names in order to facilitate comparison between the code samples. The settings-manager instance
    // is passed into the IFEE as a parameter.
    //
    // More information on IFEE: https://developer.mozilla.org/en-US/docs/Glossary/IIFE


    // The "standard" use of "settings-manager".
    //
    // Notice how the code indents after each operation. This is a common side-effect writing code which uses libraries that
    // have callbacks. Also notice how every invocation of either "load" or "clear" requires a call to the "onError" handler
    // in order to handle errors.
    (function demonstrateStandardSettingsManager(settingsManager, textArea, done) {
        /**
         * Logs to the text area for the "standard" usage of settings-manager.
         *
         * @param {string} name the name of the operation
         * @param {string} [body] the optional body to output
         */
        let log = function log(operationName, body) {
                appendOperationToTextArea(textArea, operationName, body);
            },
            /**
             * Handler for when the settings have been loaded. Adds output to the HTML textarea.
             *
             * @param {object} settings the settings which have been loaded.
             */
            onSettingsLoaded = function onSettingsLoaded(settings) {
                log(onSettingsLoaded.name, settings);
            },
            /**
             * Handler for when settings have been saved. Adds output to the HTML textarea.
             */
            onSettingsSaved = function onSettingsSaved() {
                // textArea.value += 'onSave\n=====\n';
                log(onSettingsSaved.name);
            },
            /**
             * Handle an error condition. Generally called within callbacks or as a .catch().
             *
             * @param {*} error the error to handle
             */
            onError = function onError(error) {
                // Log the error
                console.error('Error', error);
            };


        // Start with a load
        settingsManager.load(function onLoad(settings) {
            // Handle the load response and start a save
            onSettingsLoaded(settings);
            settingsManager.save({one: 1, two: 'two'}, function onSave() {
                // Handle the save response and start another load
                onSettingsSaved();
                settingsManager.load(function onLoad(settings) {
                    // Handle the load response and start another save
                    onSettingsLoaded(settings);
                    settingsManager.save({three: 3, two: 2}, function onSave() {
                        // Handle the save response and start another load
                        onSettingsSaved();
                        settingsManager.load(function onLoad(settings) {
                            // Handle the load response
                            onSettingsLoaded(settings);

                            // Notify that the "standard usage" has finished
                            done();
                        }, onError);
                    }, onError);
                }, onError);
            }, onError);
        }, onError);

    }(new SettingsManager(), textAreas.standard, deferreds.standard.done));


    // The "promisified" use of "settings-manager".
    //
    // This code is much easier to read and maintain. There are no indents because the
    // promises "chain" off of each other. Notice that the error handler is invoked exactly
    // once, in the "catch" block of the promise chain. This vastly simplifies the use of
    // the library.
    (function demonstratePromisifiedSettingsManager(promisifiedSettingsManager, textArea, done) {
        /**
         * Logs to the text area for the "standard" usage of settings-manager.
         *
         * @param {string} name the name of the operation
         * @param {string} [body] the optional body to output
         */
        let log = function log(name, body) {
                appendOperationToTextArea(textArea, name, body);
            },
            /**
             * Handler for when the settings have been loaded. Adds output to the HTML textarea.
             *
             * @param {object} settings the settings which have been loaded.
             */
            onSettingsLoaded = function onSettingsLoaded(settings) {
                // The promise "then" function receives an array of the parameters which would
                // normally be separate parameters passed to the callback
                log(onSettingsLoaded.name, ...settings);
            },
            /**
             * Handler for when settings have been saved. Adds output to the HTML textarea.
             */
            onSettingsSaved = function onSettingsSaved() {
                log(onSettingsSaved.name);
            },
            /**
             * Handle an error condition. Generally called within callbacks or as a .catch().
             *
             * @param {*} error the error to handle
             */
            onError = function onError(error) {
                // Log the error
                //
                // The promise "catch" function receives an array of the parameters which would
                // normally be separate parameters in the callback
                console.error('Error', ...error);
            };


        // This code is fairly self-documenting, and it reads easily
        //
        // As a note, the Promisifyish library allows callbacks to be specified, allowing for API
        // compability. For example, the standard call to "load" might look like:
        //   promisifiedSettingsManager.load(settings => console.log(settings))
        //
        // Although, this is preferred when using Promisifyish:
        //   promisifiedSettingsManager.load()
        //       .then(settings => console.log(settings))
        //
        // It is legal (but probably not ideal) to use both:
        //   promisifiedSettingsManager.load(settings => console.log(settings))
        //       .then(settings => console.log(settings))

        promisifiedSettingsManager.load()
        .then(onSettingsLoaded)
        .then(() => promisifiedSettingsManager.save({one: 1, two: 'two'}))
        .then(onSettingsSaved)
        .then(() => promisifiedSettingsManager.load())
        .then(onSettingsLoaded)
        .then(() => promisifiedSettingsManager.save({three: 3, two: 2}))
        .then(onSettingsSaved)
        .then(() => promisifiedSettingsManager.load())
        .then(onSettingsLoaded)
        .catch(onError)
        .then(done);

    }(Promiseify(new SettingsManager()), textAreas.promisified, deferreds.promisified.done));


    // Wait for both the standard and promiseified impementation to finish and validate
    // the results
    (function waitForAll() {
        // The alert element
        let alertElement = document.getElementById('alert'),
        /**
         * Sets the HTML DOM DIV element text.
         *
         * @param {string} message the message to set
         */
        setMessageContent = function setMessageContent(message) {
            alertElement.innerHTML = message || '';
        },
        /**
         * Sets the success message.
         *
         * @param {string} message the message to set
         */
        onSuccess = function onSuccess(message) {
            setMessageContent(message);
            alertElement.classList.add('alert-success');
        },
        /**
         * Sets the failure message.
         *
         * @param {string} message the message to set
         */
        onError = function onError(message) {
            console.log('error', message);
            setMessageContent(message || 'An error occurred.');
            alertElement.classList.add('alert-danger');
        };

        // Verify the results once all the deferreds have finished
        Promise.all([deferreds.standard.promise, deferreds.promisified.promise])
        .then(() => {
            // Get the alert HTML element
            let alertElement = document.getElementById('alert');

            // Compare the two text area values
            if (textAreas.standard.value === textAreas.promisified.value) {
                // If they match, success!
                onSuccess('Content matches');
            } else {
                // Otherwise, failure
                onError('Content does not match');
            }

            // Remove the "warning" class
            alertElement.classList.remove('alert-warning');
        })
        .catch(onError);

    }());

}());

