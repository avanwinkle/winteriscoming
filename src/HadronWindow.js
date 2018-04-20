const hboUri = "http://localhost.hadron.aws.hbogo.com:3000";
const DEFAULT_URI = hboUri + "/episode/urn:hbo:episode:GVU4NYgvPQlFvjSoJAbmL?autoplay=true";
const TIMECODE_PRECISION = 0.4;

class HadronWindow {
  constructor(univ, useIframe) {
    this.univ = univ;
    this.connectionState = "NOT_CONNECTED";
    this.loadedScene = undefined;
    this.playbackState = -1;
    this.targetUri = DEFAULT_URI + "&univ=" + univ;
    this.currentPosition = -1;
    this._useIframe = useIframe;
    this._targetWindow = undefined;
    this._targetWindowName = this.univ + "-WIC-HBOWindow";
    this._onTargetWindowReady = [];
    this._onSceneCompleteFns = [];
    this._connectProm = undefined;
  }

  connect(sceneToLoad) {
    return this._connect().then(() => {
      console.log("Window connected, executing callback to load scene:", sceneToLoad);
      this.loadScene(sceneToLoad);
    });
  }

  _connect(isRetry) {
    if (!isRetry && this._connectProm) { return this._connectProm; }
    
    this._connectProm = new Promise((resolve, reject) => {
      if (!this._targetWindow || isRetry) {
        this._pollingCount = 0;
        if (this._useIframe) {
          console.log("iFrame mode, not connecting to a window");
          var iFrame = document.getElementById(this.univ + "WICPlayerFrame");
          // iFrame hasn't loaded yet, let it use componentDidMount to connect
          if (!iFrame) { return; }
          this._targetWindow = iFrame.contentWindow;
          this.connectionState = "OPENING";
        }
        // Attempt to connect to an existing window
        else if (!isRetry) {
          console.log("Looking for existing '" + this.univ + "' target window...");
          this._targetWindow = window.open(
            undefined,
            this._targetWindowName,
            "width=800,height=600");
          this.connectionState = "RECONNECTING";
        } 
        else {
          console.log("Target window '" + this.univ + "' is not at desired url, reloading");
          this.targetWindow = window.open(
            this.targetUri,
            this._targetWindowName,
            "width=800,height=600");
          this.connectionState = "OPENING";
        }

        // Ping for a response, see if a target window exists
        this._startHandshake(resolve, reject);
      }
    });

    return this._connectProm;
  }

  debugLog() {
    console.log.apply(null, ["[" + this.univ.toUpperCase() + "]"].concat(Array.from(arguments)));
  }

  loadScene(scene) {
    if (scene === undefined) { 
      this.debugLog("Unable to go to scene undefined");
      return;
    } else {
      this.debugLog("Loading scene " + scene.id + " '" + scene.description + "'", scene);
    }

    this.loadedScene = scene;
    // this.pause();
    this.seek(scene.starttime, scene.episodeId);
  }

  onConnected(data) {
    this.connectionState = "CONNECTED";
    this.playbackState = data.playbackState;
  }

  onSceneComplete(fn) {
    this._onSceneCompleteFns.push(fn);
  }

  pause() {
    this.post({action: "pause"});
  }

  play() {
    this.post({action: "play"});
  }

  post(args) {
    var body = Object.assign({
      univ: this.univ, // Always send the univ
      message: "wic-controlaction" // Default value, can be overwritten by args
    }, args);
    this._onReady(() => { 
      // this.debugLog("Posting message:", body);
      this._targetWindow.postMessage(body, hboUri); 
    });
  }

  seek(time, episodeId) {
    this.post({action: "seek", seekTime: time, episodeId: episodeId});
  }

  toggle() {
    this.post({action: "toggle"});
  }

  updatePosition (newPosition) {
    this.currentPosition = newPosition;
    var stayInSameWindow = false;
    // If we are expecting a new scene, don't do anything
    if (this._pendingScene && this._pendingScene.starttime) {
      if (newPosition === this._pendingScene.starttime) {
        this.debugLog("Found position at pending scene! Hurray scene change complete!");
        this._pendingScene = undefined;
      } else {
        this.debugLog("Position update " + newPosition + " but a new scene is pending at " + this._pendingScene.starttime);
      }
    }
    // If no scene is loaded, ignore
    else if (!this.loadedScene) {
      this.debugLog("No scene loaded, ignoring position update");
    }
    // If we aren't playing, don't worry about it
    else if (this.loadedScene && this.playbackState === 3) {
      this.debugLog("Updated position " + newPosition + ", not playing so no scene change handling.");
    }
    // If the position at the end of our current scene (or within the margin of error)
    else if (newPosition > this.loadedScene.endtime - TIMECODE_PRECISION) {
      // If a scene is queued, play it immediately
      if (this.queuedScene) {
        stayInSameWindow = true;
        // If the next scene immediately follows this one, just keep playing
        if (newPosition >= this.queuedScene.starttime) {
          this.debugLog("loadedScene complete, flowing directly to queuedScene without action");
        } else {
          this.debugLog("loadedScene complete, advancing to queuedScene");
          this.seek(this.queuedScene.starttime);
        }
        this.loadedScene = this.queuedScene;
        this.queuedScene = undefined;
      } else {
        this.debugLog("loadedScene " + this.loadedScene.id + " finished and no queuedScene to advance/queue");
        this.loadedScene = undefined;
      }
      this._onSceneComplete(stayInSameWindow);
    }
  }

  _onReady(fn) {
    if (!this._targetWindow) { 
      this._onTargetWindowReady.push(fn);
      this._connect();
    } else {
      fn();
    }
  }

  _onSceneComplete(stayInSameWindow) {
    console.log("Executing callbacks for scene complete");
    this._onSceneCompleteFns.forEach((fn) => { fn(stayInSameWindow); });
  }

  _startHandshake(resolve, reject) {
    if (!this._targetWindow) {
      console.error("Cannot check handshake without target window");
      reject();
      this._connectProm = undefined;
      return;
    }
    else if (this.connectionState === "OPENING") {
      this.connectionState = "POLLING";
    }
    else if (this.connectionState === "RECONNECTING") {
      if (this._pollingCount < 4) {
        console.log("Waiting for existing target window '" + this.univ + "' to reconnect...");
        this._pollingCount++;
      } else if (!this._useIframe) {
        console.log(" - Existing window does not exist or did not respond. Launching a new one.");
        // If we manually attempted to reconnect, launch a window.
        this._connect(true /* isRetry */);
        return;
      }
    }
    else if (this.connectionState === "POLLING" && this._pollingCount < 30) {
      console.log("Polling target window '" + this.univ + "' for handshake...", this.connectionState);
      this._pollingCount++;
    }
    else if (this.connectionState === "CONNECTED") {
      console.log("Connected to " + this.univ + " HBO Window successful, calling " + this._onTargetWindowReady.length + " callbacks");
      this._onTargetWindowReady.forEach((readyFn) => { readyFn(); });
      resolve();
      return;
    }
    else {
      console.log("Inactive connection state '" + this.connectionState + "', cancelling poll.");
      reject();
      this._connectProm = undefined;
      return;
    }

    this.post({ message: "handshake_request" });  
    setTimeout(() => { this._startHandshake(resolve, reject); }, 1000);
  }
}

export default HadronWindow;