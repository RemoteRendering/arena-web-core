/**
 * @fileoverview Apply a jitsi video to a geometry
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */
import { ARENA_EVENTS, JITSI_EVENTS } from '../constants';

/**
 * Apply a jitsi video to a geometry
 * Jitsi video source can be defined using a jitsiId or (ARENA/Jitsi) display name
 * @module jitsi-video
 * @property {string} [jitsiId] - JitsiId of the video source; If defined will override displayName
 * @property {string} [displayName] - ARENA or Jitsi display name of the video source; Will be ignored if jitsiId is given. Editing this property requires reload
 *
 */
AFRAME.registerComponent('jitsi-video', {
    schema: {
        jitsiId: {type: 'string', default: ''},
        displayName: {type: 'string', default: ''},
    },

    init: function() {
        ARENA.events.addEventListener(ARENA_EVENTS.JITSI_LOADED, this.ready.bind(this));
    },

    ready: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        this.onJitsiConnect = this.onJitsiConnect.bind(this);
        this.onJitsiNewUser = this.onJitsiNewUser.bind(this);
        this.onJitsiUserLeft = this.onJitsiUserLeft.bind(this);

        sceneEl.addEventListener(JITSI_EVENTS.CONNECTED, this.onJitsiConnect);
        sceneEl.addEventListener(JITSI_EVENTS.USER_JOINED, this.onJitsiNewUser);
        sceneEl.addEventListener(JITSI_EVENTS.USER_LEFT, this.onJitsiUserLeft);
    },

    update: function(oldData) {
        const data = this.data;
        if (!data) return;

        if (data.jitsiId !== oldData.jitsiId) {
            this.updateVideo();
        }

        if (data.displayName !== oldData.displayName) {
            this.updateVideo(); // user will need to enter the conference again
        }
    },

    onJitsiConnect: function(e) {
        const args = e.detail;
        if (this.data.jitsiId !== '') {
            this.updateVideo();
            return;
        }

        if (this.data.displayName === '') return;

        // check local video first
        if (ARENA.Jitsi && ARENA.getDisplayName() === this.data.displayName) {
            this.data.jitsiId = ARENA.Jitsi.getJitsiId();
            this.updateVideo();
            return;
        }

        // check remote video
        args.pl.forEach((user) => {
            if (user.dn === this.data.displayName) {
                this.data.jitsiId = user.jid;
                this.updateVideo();
                return;
            }
        });

        this.updateVideo();
    },

    onJitsiNewUser: function(e) {
        const user = e.detail;
        if (this.data.displayName === '') return;

        if (user.dn === this.data.displayName) {
            this.data.jitsiId = user.jid;
            this.updateVideo();
        }
    },

    onJitsiUserLeft: function(e) {
        if (e.detail.jid === this.data.jitsiId) {
            this.el.removeAttribute('material', 'src');
        }
    },

    setVideoSrc: function() {
        const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
        if (pano) {
            this.el.setAttribute('src', `#${this.videoID}`); // video only! (no audio)
            // ensure panoramic videospheres have max download resolution
            const users = document.querySelectorAll('[arena-user]');
            users.forEach((user) => {
                const data = user.components['arena-user'].data;
                if (data.jitsiId === this.data.jitsiId) {
                    data.pano = pano;
                }
            });
        } else {
            this.el.setAttribute('material', 'src', `#${this.videoID}`); // video only! (no audio)
            this.el.setAttribute('material-extras', 'encoding', 'sRGBEncoding');
            this.el.setAttribute('material-extras', 'needsUpdate', 'true');
        }
        this.el.setAttribute('material', 'shader', 'flat');
    },

    updateVideo: function() {
        const data = this.data;
        if (!data) return;

        if (!data.jitsiId) {
            return;
        }

        if (ARENA.Jitsi.getJitsiId() === data.jitsiId) {
            const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
            if (pano) {
                // ensure panoramic videosphere local has max upload resolution, update local tracks
                ARENA.Jitsi.pano = pano;
                ARENA.Jitsi.avConnect();
            }
            this.videoID = 'cornerVideo';
        } else {
            this.videoID = `video${data.jitsiId}`;
            if (!ARENA.Jitsi.getVideoTrack(data.jitsiId)) {
                this.retryWaitVideoLoad();
                return;
            }
        }

        const jitsiVideo = document.getElementById(this.videoID);
        if (!jitsiVideo) {
            // if object not created yet, try to wait
            this.retryWaitVideoLoad();
            return;
        }

        if (jitsiVideo.readyState == 4) { // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.setVideoSrc();
            return;
        }

        // if not loaded yet, try to wait
        this.retryWaitVideoLoad();
    },

    retryWaitVideoLoad: function() {
        setTimeout(async () => {
            this.updateVideo();
        }, 500); // try again in a bit
    },
});
