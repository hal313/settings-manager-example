/**
 * Appends an operation to a text area. The operation is generally the name of a function
 * and the optional body is the content to display. The displayed body text is the result
 * of invoking JSON.stringify() on the body.
 *
 * @param {HTMLTextAreaElement} textArea the text area to append to
 * @param {string} name the name of the operation
 * @param {string} [body] the optional body of the operation
 */
export function appendOperationToTextArea(textArea, name, body) {
    textArea.value += `${name}\n${!!body?JSON.stringify(body, null, 2):''}\n=====\n`;
}