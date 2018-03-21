import React, { Component } from "react";
import SceneMap from "./SceneMap";
import EpisodeMap from "./EpisodeMap";
import WICEpisodeList from "./WICEpisodeList";
import WICFilterContainer from "./WICFilterContainer";
import WICPlayer from "./WICPlayer";
import "./App.css";

const useIFrame = true;
const hboUri = "http://localhost.hadron.aws.hbogo.com:3000";
// const wicUri = "http://localhost.hadron.aws.hbogo.com:4000"

class App extends Component {
  constructor(props) {
    super(props);
    this.targetWindow = undefined;
    this._onTargetWindowReady = [];
    this.connectionState = "NOT_CONNECTED";
    this._pollingCount = 0;
    this._pendingScene = undefined;
    
    this._filters = {
      enabled: [],   // List of ids of ALL filters, sorted by priority
      excluded: [], // List of ids of filters to be EXCLUDED
      included: [], // List of ids of filters to be INCLUDED
    };
    
    this.state = {
      isPlaying: false,
      scenes: [],
      episodes: [],
      currentPosition: 0,
      currentScene: undefined,
      nextScene: undefined,
      connection: this.connectionState,
      targetUri: undefined,
    };

    SceneMap.onReady((__scenes) => {
      var scenes = SceneMap.filterScenes(this._filters);
      this.setState({ 
        scenes: scenes,
        episodes: EpisodeMap.filterEpisodes(scenes),
        currentScene: scenes[0],
      }, () => {
        console.log(scenes);
        this._generateTargetUri();
        this._connectHBOWindow(true);
      });
    });
  }

  componentDidMount() {
  }

  _generateTargetUri() {
    // var epid = this.state.currentScene ? this._getCurrentEpisode().hboid : "urn:hbo:episode:GVU4NYgvPQlFvjSoJAbmL";
    var epid = this.state.episodes[0].hboid;
    this.setState({
      targetUri: hboUri + "/episode/" + epid + "?autoplay=true",
    });
  }

  _getCurrentEpisode() {
    return EpisodeMap.getEpisode((this.state.currentScene ? this.state.currentScene : this.state.scenes[0]).seasonepisode);
  }

  _getSceneByPosition(position) {
    var nextCurrentScene = this.state.scenes[0];
    var nextNextScene = this._getNextScene(undefined, nextCurrentScene);

    if (position < nextCurrentScene.endtime) {
      console.log("Playback has automatically transitioned into another scene");
    } else {
      console.log("Playback is far ahead of the current scene, skipping forward...");
      while (nextNextScene !== undefined && position > nextNextScene.starttime) {
        nextCurrentScene = nextNextScene;
        nextNextScene = this._getNextScene(undefined, nextNextScene);
      }
    }
    return nextCurrentScene;
  }

  _getNextScene(scenes, currentScene) {
    scenes = scenes || this.state.scenes;
    currentScene = currentScene || this.state.currentScene || scenes[0];
    var currentIdx = scenes.indexOf(currentScene);
    var nextScene;

    // If the current scene does not exist in the list of scenes, find the appropriate next one
    // based on the timestamp and the current play position, i.e. whichever would be next in time
    if (currentIdx === -1) {
      scenes.forEach((scene) => {
        if (nextScene === undefined && scene.starttime > currentScene.starttime) {
          nextScene = scene;
        }
      });
    } 
    // If the current scene does exist, the next scene will be next (if we're not at the end of the array)
    else if (currentIdx < scenes.length - 1) {
      nextScene = scenes[currentIdx + 1];
    }
    // Otherwise, there is no next scene
    
    return nextScene;
  }

  goToScene(scene) {
    if (scene === undefined) { 
      console.warn("Unable to go to scene undefined");
      return;
    }
    // Store the upcoming scene synchronously in case position updates come in before we can seek to it
    this._pendingScene = scene;

    var episode = EpisodeMap.getEpisode(scene.seasonepisode);
    if (episode === this._getCurrentEpisode()) {
      this._postMessage("seek", scene.starttime);
    } else {
      this.targetWindow.postMessage({
        message: "play_episode",
        episodeId: episode.hboid,
        seekTime: scene.starttime,
      }, hboUri);
    }

    this.setState({
      currentScene: scene,
      nextScene: this._getNextScene(undefined, scene),
    });
  }

  _postMessage(action, param) {
    if (action === "seek" && param === undefined) {
      param = parseInt(this.state.currentPosition, 10);
    } else if (action === "toggle") {
      action = this.state.isPlaying ? "pause" : "play";
      this.setState({ isPlaying: !this.state.isPlaying });
    }

    var postControlAction = () => {
      this.targetWindow.postMessage({
        message: "wic-controlaction",
        action: action,
        param: param,
      }, hboUri);
    };

    if (!this.targetWindow) { 
      console.log("no target window, going to cache postcontrol action '"+ action + "' with param ", param);
      this._onTargetWindowReady.push(postControlAction);
      this._connectHBOWindow();
    } else {
      postControlAction();
    }

  }

  _receiveMessage(event) {
    if (event.data.message === "handshake_received") {
      console.log("Handshake received!");
      this.connectionState = "CONNECTED";
      this.setState({ connection: this.connectionState });
    }
    else if (event.data.message === "reconnect_request") {
      this._postMessage("reconnect_response");
    }
    else if (event.data.message === "position") {
      // If we haven't set a current scene, set one according to the current position
      if (this.state.currentScene === undefined) {
        this.setState({ currentScene: this._getSceneByPosition(event.data.value) });
      }
      this._updatePosition(event.data.value);
    }
  }

  _updatePosition(newPosition) {
    // If we are expecting a new scene, don't do anything
    if (this._pendingScene) {
      if (newPosition === this._pendingScene.starttime) {
        console.log("Found position at pending scene! Hurray scene change complete!");
        this._pendingScene = undefined;
      } else {
        console.log("Position update " + newPosition + " but a new scene is pending at " + this._pendingScene.starttime);
      }
    }
    // If we are paused, don't worry about it
    else if (!this.state.isPlaying) {
      console.log("Updated position " + newPosition + ", player is paused so no scene change handling.");
    }
    // If we don't have a current scene, find one
    else if (this.state.currentScene === undefined) {
      console.log("No current scene, can't update position. TODO: Find one!");
    }
    // If the position is before our current scene, skip ahead
    else if (newPosition < this.state.currentScene.starttime) {
      console.log("Playback position is before current scene, skipping ahead.");
      this._postMessage("seek", this.state.currentScene.starttime);
    }
    // If the position at the end of our current scene and before the next scene, skip to the next
    else if (newPosition > this.state.currentScene.endtime && this.state.nextScene && newPosition < this.state.nextScene.starttime) {
      console.log("Playback position " + newPosition + " is after current scene endtime " + this.state.currentScene.endtime + ", advancing");
      this.goToScene(this.state.nextScene);
    }
    // If we're after the start of the next scene
    else if (this.state.nextScene && newPosition > this.state.nextScene.starttime) {
      var nextCurrentScene = this._getSceneByPosition(newPosition);
      var nextNextScene = this._getNextScene(undefined, this.state.nextScene);

      this.setState({
        currentScene: nextCurrentScene,
        nextScene: nextNextScene,
      });
    }
    this.setState({ currentPosition: newPosition });
  }

  _handleFilterChange() {
    var scenes = SceneMap.filterScenes(this._filters);
    this.setState({ 
      scenes: scenes,
      episodes: EpisodeMap.filterEpisodes(scenes),
      nextScene: this._getNextScene(scenes),
    });
  }

  _handlePlay() {
    this.setState({
      currentScene: this.state.currentScene || this.state.scenes[0],
      nextScene: this.state.nextScene || this.state.scenes[1],
    });
    this._postMessage("toggle");
  }

  _handleNav(action) {
    switch (action) {
    case "prevFrameMd":
      this._postMessage("seek", this.state.currentPosition - 1.5);
      break;
    case "nextFrameMd":
      this._postMessage("seek", this.state.currentPosition + 1.5);
      break;
    case "prevFrameSm":
      this._postMessage("seek", this.state.currentPosition - 1);
      break;
    case "nextFrameSm":
      this._postMessage("seek", this.state.currentPosition + 1);
      break;
    case "nextScene":
      this.goToScene(this._getNextScene());
      break;
    case "firstScene":
      this.goToScene(this.state.scenes[0]);
      break;
    default:
      console.warn("Unknown nav action '" + action +"'");
    }
  }

  _connectHBOWindow(isAuto) {
    if (!this.targetWindow) {
      if (useIFrame) {
        console.log("iFrame mode, not connecting to a window");
        var iFrame = document.getElementById("WICPlayerFrame");
        // iFrame hasn't loaded yet, let it use componentDidMount to connect
        if (!iFrame) { return; }
        this.targetWindow = iFrame.contentWindow;
        this.connectionState = "OPENING";
      }
      // Attempt to connect to an existing window
      else {
        this.targetWindow = window.open(
          undefined,
          "WIC-HBOWindow",
          "width=800,height=600");
        this.connectionState = isAuto ? "AUTOCONNECTING" : "RECONNECTING";
      }
      window.addEventListener("message", this._receiveMessage.bind(this));
    }
    // Ping for a response, see if a target window exists
    this._startHandshake();
  }

  _launchHBOWindow() {
    if (!useIFrame) {
      console.log("Target window is not at HBO, reloading");
      this.targetWindow = window.open(
        this._generateTargetUri(),
        "WIC-HBOWindow",
        "width=800,height=600");
    }
    this.connectionState = "OPENING";
  }


  _startHandshake() {
    this.setState({ connection: this.connectionState });
    
    if (!this.targetWindow) {
      console.error("Cannot check handshake without target window");
      return;
    }
    else if (this.connectionState === "OPENING") {
      this.connectionState = "POLLING";
      this._pollingCount = 0;
    }
    else if (this.connectionState === "RECONNECTING" || this.connectionState === "AUTOCONNECTING") {
      if (this._pollingCount < 1) {
        console.log("Waiting for existing target window to reconnect...");
        this._pollingCount++;
      } else if (!useIFrame) {
        console.log(" - Existing window does not exist or did not respond. Launching a new one.");
        // If we manually attempted to reconnect, launch a window.
        this._launchHBOWindow();
      }
    }
    else if (this.connectionState === "POLLING" && this._pollingCount < 30) {
      console.log("Polling target window for handshake...", this.connectionState);
      this._pollingCount++;
    }
    else if (this.connectionState === "CONNECTED") {
      console.log("Connected to HBO Window successful, calling " + this._onTargetWindowReady.length + " callbacks");
      this._onTargetWindowReady.forEach((readyFn) => { readyFn(); });
      return;
    }
    else {
      console.log("Inactive connection state '" + this.connectionState + "', cancelling poll.");
      return;
    }
    this.targetWindow.postMessage({ message: "handshake_request" }, hboUri);  
    setTimeout(this._startHandshake.bind(this), 1000);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src="images/got-logo-white.png" alt="logo" style={{ opacity: 0.05 }}/>
        </header>
        <div id="ContentSection">
          <div id="PlayerSection">
            { useIFrame && this.state.targetUri && (
              <WICPlayer src={this.state.targetUri}
                onMount={this._connectHBOWindow.bind(this)} />
            )}
            <div id="PlayerControlSection" style={{textAlign: "left"}}>
              <br/>
              <button onClick={(__e) => this._handleNav("firstScene")}>&lt;&lt; Start from Beginning</button>
              <button onClick={(__e) => this._handlePlay()}>{this.state.isPlaying ? "Pause" : "Play"}</button>
              <button onClick={(__e) => this._handleNav("nextScene")} enabled={(!!this.state.nextScene).toString()}>Next Scene &gt;</button>
              <br/><br/>
              <button onClick={(__e) => this._handleNav("prevFrameMd")}>&lt;&lt;| 1s </button>
              &nbsp;
              <button onClick={(__e) => this._handleNav("prevFrameSm")}>&lt;| 100ms </button>
              &nbsp;&nbsp;
              <button onClick={(__e) => this._handleNav("nextFrameSm")}>100ms |&gt;</button>
              &nbsp;
              <button onClick={(__e) => this._handleNav("nextFrameMd")}>1s |&gt;&gt;</button>
              <br /><br/>
              { this.state.currentScene && !this.state.isPlaying && (
                <div style={{fontSize: "160%", color: "#EEEEEE"}}>
                  {parseInt((this._getCurrentEpisode().duration - this.state.currentPosition)*1000, 10)/100}
                </div>
              )}
            </div>
          </div>
          <WICEpisodeList 
            episodes={this.state.episodes} 
            currentScene={this.state.currentScene} 
            onScenePlay={this.goToScene.bind(this)}
          />
        </div>
        <WICFilterContainer filters={this._filters} onFilterChange={this._handleFilterChange.bind(this)}/>
        <div id="StatusSection">
          <div>{this.state.connection}</div>
          <div>{parseInt(this.state.currentPosition*1000, 10)/100}</div>
        </div>
      </div>
    );
  }
}

export default App;
