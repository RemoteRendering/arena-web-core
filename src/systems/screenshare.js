/* global AFRAME, ARENA */

/**
 * @fileoverview Screen share System to keep track of all screenshareable objects.
 *
 */

/**
 * Screenshare-able System. Allows an object to be screenshared upon
 * @module screenshareable
 *
 */
AFRAME.registerSystem('screenshareable', {
    schema: {},

    init() {
        this.screenshareables = {};
    },

    registerComponent(object) {
        const objId = object.el.id.trim();
        this.screenshareables[objId] = object;
    },

    unregisterComponent(object) {
        const objId = object.el.id.trim();
        delete this.screenshareables[objId];
    },

    getAll() {
        return this.screenshareables;
    },

    getAllAsList() {
        return Object.keys(this.screenshareables);
    },

    asHTMLSelect() {
        // creates an HTML select list for usage in screen share icon
        let res = `<select id='screenshareables' class='swal2-select' multiple>`;
        if (Object.keys(this.screenshareables).length > 0) {
            Object.keys(this.screenshareables).forEach((obj) => {
                res += `<option value='${obj}'>${obj}</option>`;
            });
        } else {
            // add only one option: the default screen share object name
            const defaultScreenObj = ARENA.screenshare ? ARENA.screenshare : 'screenshare';
            res += `<option value='${defaultScreenObj}'>${defaultScreenObj}</option>`;
        }
        res += `</select>`;
        return res;
    },

    get(object) {
        const objId = object.el.id.trim();
        return this.screenshareable[objId];
    },
});
