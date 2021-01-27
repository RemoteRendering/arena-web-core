import Swal from 'sweetalert2'; // Alerts

// Ref : https://github.com/samdutton/simpl/blob/gh-pages/getusermedia/sources/js/main.js
window.setupAV = (callback) => {
    const setupPanel = document.getElementById('avSetup');
    const videoElement = document.getElementById('vidPreview');
    const audioInSelect = document.getElementById('audioSourceSelect');
    const audioOutSelect = document.getElementById('audioOutSelect');
    const videoSelect = document.getElementById('vidSourceSelect');
    const testAudioOut = document.getElementById('testAudioOut');
    const testAudioOutBtn = document.getElementById('playTestAudioOutBtn');
    const testAudioOutIcon = document.getElementById('playTestAudioOutIcon');
    const micMeter = document.getElementById('micMeter');

    let mediaStreamSource = null;
    let meterProcess = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    audioInSelect.onchange = getStream;
    videoSelect.onchange = getStream;
    // This will fail on a lot of browsers :(
    audioOutSelect.onchange = () => testAudioOut.setSinkId && testAudioOut.setSinkId(audioOutSelect.value);

    function getDevices() {
        // AFAICT in Safari this only gets default devices until gUM is called :/
        return navigator.mediaDevices.enumerateDevices();
    }

    function gotDevices(deviceInfos) {
        // Faster than innerHTML. No options have listeners so this is ok
        audioInSelect.textContent = '';
        audioOutSelect.textContent = '';
        videoSelect.textContent = '';
        window.deviceInfos = deviceInfos; // make available to console
        for (const deviceInfo of deviceInfos) {
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            switch (deviceInfo.kind) {
            case 'audioinput':
                option.text = deviceInfo.label || `Microphone ${audioInSelect.length + 1}`;
                audioInSelect.appendChild(option);
                break;
            case 'audiooutput':
                option.text = deviceInfo.label || `Speaker ${audioOutSelect.length + 1}`;
                audioOutSelect.appendChild(option);
                break;
            case 'videoinput':
                option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
                videoSelect.appendChild(option);
                break;
            default:
                //
            }
        }
        const noElementOption = document.createElement('option');
        noElementOption.setAttribute('selected', true);
        noElementOption.text = 'No Device Detected';
        if (!audioInSelect.childElementCount) {
            audioInSelect.appendChild(noElementOption.cloneNode(true));
        }
        audioInSelect.selectedIndex = 0;
        if (!videoSelect.childElementCount) {
            videoSelect.appendChild(noElementOption.cloneNode(true));
        }
        videoSelect.selectedIndex = 0;
        if (!audioOutSelect.childElementCount) {
            noElementOption.text = 'Default Device';
            audioOutSelect.appendChild(noElementOption.cloneNode(true));
        }
        audioOutSelect.selectedIndex = 0;
    }

    function getStream() {
        if (window.stream) {
            window.stream.getTracks().forEach((track) => {
                track.stop();
            });
        }
        const audioSource = audioInSelect.value;
        const videoSource = videoSelect.value;
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
            video: {deviceId: videoSource ? {exact: videoSource} : undefined},
        };
        localStorage.setItem('mediaConstraints', JSON.stringify(constraints));
        return navigator.mediaDevices.getUserMedia(constraints).
            then(gotStream).catch(handleMediaError);
    }

    function gotStream(stream) {
        window.stream = stream; // make stream available to console
        audioInSelect.selectedIndex = [...audioInSelect.options].
            findIndex((option) => option.text === stream.getAudioTracks()[0].label);
        videoSelect.selectedIndex = [...videoSelect.options].
            findIndex((option) => option.text === stream.getVideoTracks()[0].label);
        videoElement.srcObject = stream;


        // Scale video preview container
        let aspectRatioClass = '';
        const vidSettings = stream.getVideoTracks()[0].getSettings();
        switch ((vidSettings.width/vidSettings.height).toFixed(2)) {
        case '1.33':
            aspectRatioClass = 'ratio ratio-4x3';
            break;
        case '1.77':
            aspectRatioClass = 'ratio ratio-16x9';
            break;
        default:
            //
        }
        videoElement.parentElement.setAttribute('class', aspectRatioClass);

        // Mic Test Meter via https://github.com/cwilso/volume-meter/
        meterProcess && meterProcess.shutdown();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        meterProcess = createAudioMeter(audioContext);
        mediaStreamSource.connect(meterProcess);
        micDrawLoop();
    }

    async function handleMediaError(error) {
        console.log('Error: ', error);
        await Swal.fire({
            title: 'Oops...',
            html: `Could not initialize devices.<br/>
                Please ensure your devices are plugged in and allow 
                browser audio and video access permissions.<br/>
                You can attempt to re-detect devices.`,
            icon: 'error'});
    }

    const detectDevices = () => {
        getStream().then(getDevices).then(gotDevices).catch(handleMediaError);
    };


    function micDrawLoop() {
        // set bar based on the current volume
        const vol = meterProcess.volume * 100 * 3;
        micMeter.setAttribute('style', `width: ${vol}%`);
        micMeter.setAttribute('aria-valuenow', '' + vol);
        // set up the next visual callback
        window.requestAnimationFrame( micDrawLoop );
    }

    testAudioOutBtn.addEventListener('click', () => {
        if (testAudioOut.paused) {
            testAudioOutIcon.setAttribute('class', 'fas fa-volume-up');
            testAudioOut.play();
        } else {
            testAudioOutIcon.setAttribute('class', 'fas fa-volume-off');
            testAudioOut.pause();
            testAudioOut.currentTime = 0;
        }
    });
    testAudioOutBtn.addEventListener('ended', () => {
        testAudioOutIcon.setAttribute('class', 'fas fa-volume-off');
    });

    document.getElementById('redetectAVBtn').addEventListener('click', detectDevices);
    document.getElementById('enterSceneAVBtn').addEventListener('click', () => {
        setupPanel.classList.add('d-none');
        if (callback) callback();
    });
    document.getElementById('sceneURL').value = window.location.href;

    // Init
    setupPanel.classList.remove('d-none');
    detectDevices();
};
