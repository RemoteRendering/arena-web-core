/**
 * @fileoverview HTML buttons for user settings (a/v, avatar, flying, etc.)
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA, ARENAAUTH, Swal */

import { ARENA_EVENTS } from '../../constants';
import './remove-stats-exit-fullscreen';

const ICON_BTN_CLASS = 'arena-button arena-side-menu-button';

const SpeedState = Object.freeze({
    MEDIUM: 0,
    FAST: 1,
    SLOW: 2,
});

/**
 * Creates a button that will be displayed as an icon on the left of the screen
 * @param {string} initialImage name of initial image to be displayed
 * @param {string} tooltip tip to be displayed on hover
 * @param {function} onClick function that will be run on click
 * @return {Object} div that is the parent of the button
 */
function createIconButton(initialImage, tooltip, onClick) {
    // Create elements.
    const wrapper = document.createElement('div');
    const iconButton = document.createElement('button');
    iconButton.style.backgroundImage = `url('src/systems/ui/images/${initialImage}.png')`;
    iconButton.className = ICON_BTN_CLASS;
    iconButton.setAttribute('id', `btn-${initialImage}`);
    iconButton.setAttribute('title', tooltip);

    // Insert elements.
    wrapper.appendChild(iconButton);
    iconButton.addEventListener('click', (evt) => {
        onClick();
        evt.stopPropagation();

        // Button focus is different per browser, so set manual focus. In general, we need to check
        // UI elements on our overlay that can keep input focus, since the natural implementation
        // on most browsers is that input elements capture tab/arrow/+chars for DOM navigation and
        // input.

        // Chrome appears to leave focus on the button, but we need it back to body for 3D navigation.
        document.activeElement.blur();
        document.body.focus();
    });

    wrapper.onClick = onClick;
    return wrapper;
}

/**
 * SideMenu component
 */
AFRAME.registerSystem('arena-side-menu-ui', {
    schema: {
        enabled: { type: 'boolean', default: true },

        speedButtonEnabled: { type: 'boolean', default: true },
        speedButtonText: { type: 'string', default: 'Set movement speed.' },

        flyingButtonEnabled: { type: 'boolean', default: true },
        flyingButtonText: { type: 'string', default: 'Flying on/off.' },

        logoutButtonEnabled: { type: 'boolean', default: true },
        logoutButtonText: { type: 'string', default: 'Sign out of the this.arena.' },

        additionalSettingsButtonEnabled: { type: 'boolean', default: true },
    },

    init() {
        ARENA.events.addMultiEventListener(
            [ARENA_EVENTS.ARENA_LOADED, ARENA_EVENTS.JITSI_LOADED],
            this.ready.bind(this)
        );
    },

    ready() {
        const { data, el } = this;

        const { sceneEl } = el;

        if (!data.enabled) return;

        this.arena = sceneEl.systems['arena-scene'];

        this.iconsDiv = document.getElementById('side-menu');
        this.iconsDiv.parentElement.classList.remove('d-none');

        // button names, to be used by other modules
        this.buttons = {
            SPEED: 'speed',
            FLYING: 'fly',
            SCREENSHARE: 'screenshare',
            AVSETTINGS: 'av-settings',
            LOGOUT: 'logout',
        };

        // we will save a list of the buttons other modules can request to be clicked
        this._buttonList = [];

        this.settingsButtons = [];

       
    
        this.onSpeedButtonClick = this.onSpeedButtonClick.bind(this);
        this.onFlyingButtonClick = this.onFlyingButtonClick.bind(this);
        this.onLogoutButtonClick = this.onLogoutButtonClick.bind(this);
        this.onAdditionalSettingsButtonClick = this.onAdditionalSettingsButtonClick.bind(this);

        // Create speed button
        if (data.speedButtonEnabled) {
            this.speedState = SpeedState.MEDIUM;
            this.speedButton = createIconButton('speed-medium', data.speedButtonText, this.onSpeedButtonClick);
            this.speedButton.style.display = 'none';
            this.settingsButtons.push(this.speedButton);

            this._buttonList[this.buttons.SPEED] = this.speedButton;
            this.iconsDiv.appendChild(this.speedButton);
        }

        // Create flying on/off button
        if (data.flyingButtonEnabled) {
            this.flying = false;
            this.flyingButton = createIconButton('flying-off', data.flyingButtonText, this.onFlyingButtonClick);
            this.flyingButton.style.display = 'none';
            this.settingsButtons.push(this.flyingButton);

            this._buttonList[this.buttons.FLYING] = this.flyingButton;
            this.iconsDiv.appendChild(this.flyingButton);
        }

        // Create logout button
        if (data.logoutButtonEnabled) {
            this.logoutButton = createIconButton('logout', data.logoutButtonText, this.onLogoutButtonClick);
            this.logoutButton.style.display = 'none';
            this.settingsButtons.push(this.logoutButton);

            this._buttonList[this.buttons.LOGOUT] = this.logoutButton;
            this.iconsDiv.appendChild(this.logoutButton);
        }

        // Create additional setting button
        if (data.additionalSettingsButtonEnabled) {
            this.expanded = false;
            this.settingsButton = document.getElementById('side-menu-expand-button');

            this.createAdditionalSettings();
            document.getElementById('side-menu-expand').addEventListener('click', this.onAdditionalSettingsButtonClick);
        }
    },

    createAdditionalSettings() {
        const sceneWriter = this.arena.isUserSceneWriter();

        /**
         * Embolden text.
         * @param {*} el Element object
         * @param {*} text Text to bold
         */
        function appendBold(el, text) {
            const b = document.createElement('b');
            b.innerText = text;
            el.append(b);
        }

        // Add settings panel
        this.settingsPopup = document.createElement('div');
        this.settingsPopup.className = 'settings-popup px-3 py-1'; // remove bg-white to inherit transparency
        document.body.appendChild(this.settingsPopup);

        const closeSettingsButton = document.createElement('span');
        closeSettingsButton.className = 'close pe-2';
        closeSettingsButton.innerHTML = '&times';
        this.settingsPopup.appendChild(closeSettingsButton);

        const formDiv = document.createElement('div');
        formDiv.className = 'pb-3';
        this.settingsPopup.appendChild(formDiv);

        let label = document.createElement('span');
        label.innerHTML = 'Settings';
        label.style.fontSize = 'medium';
        label.style.fontStyle = 'bold';
        formDiv.appendChild(label);

        // Scene status dialogs
        const statusDiv = document.createElement('div');
        appendBold(statusDiv, 'Status: ');
        formDiv.appendChild(statusDiv);

        const credits = document.createElement('a');
        credits.href = '#';
        credits.innerHTML = 'Credits';
        credits.title = 'Show the credits for models in the scene';
        credits.onclick = this.showCredits.bind(this);
        statusDiv.appendChild(credits);

        statusDiv.append(' | ');

        const stats = document.createElement('a');
        stats.href = '#';
        stats.innerHTML = 'Stats';
        stats.title = 'Show the A-Frame performance stats and user pose data for you';
        stats.onclick = this.showStats.bind(this);
        statusDiv.append(stats);

        statusDiv.append(' | ');

        const perms = document.createElement('a');
        perms.href = '#';
        perms.innerHTML = 'Permissions';
        perms.title = 'Show the security permissions for you in the scene';
        perms.onclick = ARENAAUTH.showPerms;
        statusDiv.appendChild(perms);

        // Page links
        const pagesDiv = document.createElement('div');
        appendBold(pagesDiv, 'Pages: ');
        formDiv.appendChild(pagesDiv);

        const edit = document.createElement('a');

        edit.href = `/build/?scene=${this.arena.namespacedScene}`;
        edit.target = 'ArenaJsonEditor';
        edit.rel = 'noopener noreferrer';
        edit.innerHTML = 'Json Editor';
        edit.title = 'Open the JSON Scene Editor for this scene in a new page';
        pagesDiv.appendChild(edit);

        pagesDiv.append(' | ');

        if (sceneWriter) {
            // add permissions link
            const edit3d = document.createElement('a');
            edit3d.href = `/${this.arena.namespacedScene}?build3d=1`;
            edit3d.target = 'Arena3dEditor';
            edit3d.rel = 'noopener noreferrer';
            edit3d.innerHTML = '3D Editor';
            edit3d.title = 'Open the 3D Scene Editor for this scene in a new page (editors only)';
            pagesDiv.appendChild(edit3d);

            pagesDiv.append(' | ');
        }

        const profile = document.createElement('a');
        profile.href = `/user/profile`;
        profile.target = '_blank';
        profile.rel = 'noopener noreferrer';
        profile.innerHTML = 'Profile';
        profile.title = 'Open your user account Profile in a new page';
        pagesDiv.append(profile);

        pagesDiv.append(' | ');

        const docs = document.createElement('a');
        docs.href = 'https://docs.arenaxr.org';
        docs.target = '_blank';
        docs.rel = 'noopener noreferrer';
        docs.innerHTML = 'Docs';
        docs.title = 'Open the ARENA documentation in another page';
        pagesDiv.appendChild(docs);

        pagesDiv.append(' | ');

        const version = document.createElement('a');
        version.href = '/conf/versions.html';
        version.target = '_blank';
        version.rel = 'noopener noreferrer';
        version.innerHTML = 'Version';
        version.title = 'Show the ARENA versions listed on a new page';
        pagesDiv.appendChild(version);

        // Auth status
        appendBold(formDiv, 'Scene: ');
        this.sceneNameDiv = document.createElement('span');
        formDiv.appendChild(this.sceneNameDiv);
        if (sceneWriter) {
            // add permissions link
            formDiv.append(' (');
            const aSec = document.createElement('a');
            aSec.href = `/user/profile/scenes/${this.arena.namespacedScene}`;
            aSec.target = '_blank';
            aSec.rel = 'noopener noreferrer';
            aSec.innerHTML = 'Security';
            aSec.title = 'Open the security controls for the scene (editors only)';
            formDiv.appendChild(aSec);
            formDiv.append(')');
        }
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'Authenticator: ');
        this.authType = document.createElement('span');
        this.authType.style.textTransform = 'capitalize';
        formDiv.appendChild(this.authType);
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'ARENA Username: ');
        this.authUsername = document.createElement('span');
        formDiv.appendChild(this.authUsername);
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'Email: ');
        this.authEmail = document.createElement('span');
        formDiv.appendChild(this.authEmail);
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'Name: ');
        this.authFullname = document.createElement('span');
        formDiv.appendChild(this.authFullname);

        this.usernameInputDiv = document.createElement('div');
        this.usernameInputDiv.className = 'my-2';

        label = document.createElement('label');
        label.className = 'form-label mb-0';
        label.setAttribute('for', 'settingsUsernameInput');
        label.innerHTML = 'Display Name';
        this.usernameInputDiv.appendChild(label);

        this.nameRegex = '^(?=[^A-Za-z]*[A-Za-z]{2,})[ -~]*$';
        this.usernameInput = document.createElement('input');
        this.usernameInput.setAttribute('type', 'text');
        this.usernameInput.setAttribute('pattern', this.nameRegex);
        this.usernameInput.setAttribute('name', 'settingsUsernameInput');
        this.usernameInput.className = 'form-control';
        this.usernameInputDiv.appendChild(this.usernameInput);

        formDiv.appendChild(this.usernameInputDiv);

        const saveSettingsButton = document.createElement('button');
        saveSettingsButton.innerHTML = 'Save';
        saveSettingsButton.className = 'btn btn-info btn-sm';
        formDiv.appendChild(saveSettingsButton);

        const iconCredits = document.createElement('p');
        iconCredits.innerHTML =
            'Icons made by <a href="https://www.flaticon.com/authors/smashicons" title="Smashicons">Smashicons</a>, <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>';
        formDiv.appendChild(iconCredits);

        const _this = this;
        closeSettingsButton.onclick = function onCloseClick() {
            _this.settingsPopup.style.display = 'none'; // close settings panel
            _this.saveSettings();
        };

        saveSettingsButton.onclick = function onSaveClick() {
            _this.saveSettings();
        };
    },

    onSpeedButtonClick() {
        console.log("Yes, my changes are here!!!");
        const { el } = this;

        const { sceneEl } = el;
        const cameraEl = sceneEl.camera.el;

        const speedMod = Number(this.arena.sceneOptions?.speedModifier) || 1;
        if (speedMod) {
            // Set new initial speed if applicable
            cameraEl.setAttribute('wasd-controls', { acceleration: 30 * speedMod });
            cameraEl.setAttribute('press-and-move', { acceleration: 30 * speedMod });
        }

        if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

        this.speedState = (this.speedState + 1) % 3;
        if (this.speedState === SpeedState.MEDIUM) {
            // medium
            this.speedButton.childNodes[0].style.backgroundImage = "url('src/systems/ui/images/speed-medium.png')";
            cameraEl.setAttribute('wasd-controls', { acceleration: 30 * speedMod });
            cameraEl.setAttribute('press-and-move', { acceleration: 30 * speedMod });
        } else if (this.speedState === SpeedState.FAST) {
            // fast
            this.speedButton.childNodes[0].style.backgroundImage = "url('src/systems/ui/images/speed-fast.png')";
            cameraEl.setAttribute('wasd-controls', { acceleration: 60 * speedMod });
            cameraEl.setAttribute('press-and-move', { acceleration: 60 * speedMod });
        } else if (this.speedState === SpeedState.SLOW) {
            // slow
            this.speedButton.childNodes[0].style.backgroundImage = "url('src/systems/ui/images/speed-slow.png')";
            cameraEl.setAttribute('wasd-controls', { acceleration: 15 * speedMod });
            cameraEl.setAttribute('press-and-move', { acceleration: 15 * speedMod });
        }
    },

    onFlyingButtonClick() {
        const { el } = this;

        const { sceneEl } = el;
        const cameraEl = sceneEl.camera.el;

        if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

        this.flying = !this.flying;
        if (this.flying) {
            // toggled on
            this.flyingButton.childNodes[0].style.backgroundImage = "url('src/systems/ui/images/flying-on.png')";
        } else {
            // toggled off
            cameraEl.components['wasd-controls'].resetNav();
            cameraEl.components['press-and-move'].resetNav();
            cameraEl.object3D.position.y = this.arena.defaults.camHeight;
            this.flyingButton.childNodes[0].style.backgroundImage = "url('src/systems/ui/images/flying-off.png')";
        }
        cameraEl.setAttribute('wasd-controls', { fly: this.flying });
        cameraEl.setAttribute('press-and-move', { fly: this.flying });
    },

    onLogoutButtonClick() {
        Swal.fire({
            title: 'You are about to sign out of the ARENA!',
            text: 'Are you sure you want to sign out?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            reverseButtons: true,
        }).then((result) => {
            if (result.isConfirmed) {
                ARENAAUTH.signOut();
            }
        });
    },

    onAdditionalSettingsButtonClick() {
        this.expanded = !this.expanded;
        if (this.expanded) {
            // toggled
            this.settingsButton.classList.replace('fa-angle-down', 'fa-angle-up');
            for (let i = 0; i < this.settingsButtons.length; i++) {
                this.settingsButtons[i].style.display = 'block';
            }
            this.settingsPopup.style.display = 'block'; // open settings panel
            this.loadSettings();
        } else {
            this.settingsButton.classList.replace('fa-angle-up', 'fa-angle-down');
            for (let i = 0; i < this.settingsButtons.length; i++) {
                this.settingsButtons[i].style.display = 'none';
            }
            this.settingsPopup.style.display = 'none'; // close settings panel
            this.saveSettings();
        }
    },

    loadSettings() {
        this.usernameInput.value = localStorage.getItem('display_name');

        const auth = ARENAAUTH.getAuthStatus();
        this.sceneNameDiv.textContent = this.arena.namespacedScene;
        this.authenticated = auth.authenticated;
        this.authType.textContent = auth.type;
        this.authUsername.textContent = auth.username;
        this.authFullname.textContent = auth.fullname;
        this.authEmail.textContent = auth.email;
    },

    saveSettings() {
        const { el } = this;

        const { sceneEl } = el;
        const cameraEl = sceneEl.camera.el;

        const re = new RegExp(this.nameRegex);
        // if name has at least one alpha char
        if (re.test(this.usernameInput.value)) {
            // remove extra spaces
            const displayName = this.usernameInput.value.replace(/\s+/g, ' ').trim();
            localStorage.setItem('display_name', displayName); // save for next use
            cameraEl.setAttribute('arena-camera', 'displayName', displayName); // push to other users' views
            sceneEl.emit(ARENA_EVENTS.NEW_SETTINGS, { userName: displayName });
        }
    },

    showStats(e) {
        e.preventDefault();
        const sceneEl = document.querySelector('a-scene');
        const statsEl = sceneEl.getAttribute('stats');
        sceneEl.setAttribute('stats', !statsEl);
        const cam = document.getElementById('my-camera');
        const { showStats } = cam.getAttribute('arena-camera');
        cam.setAttribute('arena-camera', {
            showStats: !showStats,
        });
    },

    showCredits(e) {
        e.preventDefault();
        this.settingsPopup.style.display = 'none'; // close settings panel
        const attrSystem = document.querySelector('a-scene').systems.attribution;
        let attrTable;
        if (attrSystem) {
            attrTable = attrSystem.getAttributionTable();
        }
        if (attrTable === undefined) {
            Swal.fire({
                title: 'Scene Credits',
                text: 'Could not find any attributions (did you add an attribution component to models?).',
                icon: 'error',
            }).then(() => {
                this.settingsPopup.style.display = 'block'; // show settings panel
            });
            return;
        }
        Swal.fire({
            title: 'Scene Credits',
            html: attrTable,
            width: 800,
            focusConfirm: false,
            showCancelButton: false,
            cancelButtonText: 'Cancel',
        }).then(() => {
            this.settingsPopup.style.display = 'block';
        });
    },

    clickButton(button) {
        this._buttonList[button].onClick();
    },
});
