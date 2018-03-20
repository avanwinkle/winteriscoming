import React, { Component } from "react";
import SceneMap from "./SceneMap";
import EpisodeMap from "./EpisodeMap";
import WICEpisodeList from "./WICEpisodeList";
import WICFilterAutoComplete from "./WICFilterAutoComplete";
import WICFilterContainer from "./WICFilterContainer";
import WICPlayer from "./WICPlayer";
import WICSceneList from "./WICSceneList";
import "./App.css";

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
      seekTime: 0,
      scenes: [],
      episodes: [],
      currentPosition: 0,
      currentScene: undefined,
      nextScene: undefined,
      connection: this.connectionState,
    };

    SceneMap.onReady((__scenes) => {
      EpisodeMap.onReady((__episodes) => {
        this._fetchTokenAndEpisodes().then(() => {
          var scenes = SceneMap.filterScenes(this._filters);
          this.setState({ 
            scenes: scenes,
            episodes: EpisodeMap.filterEpisodes(scenes),
          });
          this._connectHBOWindow(true);
        });
      });
    });
  }

  componentDidMount() {
  }

  _fetchTokenAndEpisodes() {
    return new Promise((resolve, reject) => {
      fetch("https://comet.api.hbo.com/tokens", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          "client_id":"88a4f3c6-f1de-42d7-8ef9-d3b00139ea6a",
          "client_secret":"88a4f3c6-f1de-42d7-8ef9-d3b00139ea6a",
          "scope":"browse video_playback_free",
          "grant_type":"client_credentials",
        }),
      }).then(res => res.json()).then(
        (response) => {
          this._hurleyToken = response.access_token;
          resolve(EpisodeMap.fetchEpisodeMetadata(this._hurleyToken));
        }, (reason) => {
          reject(reason);
        }
      );

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
    this.setState({
      currentScene: scene,
      nextScene: this._getNextScene(undefined, scene),
      seekTime: scene.starttime,
    });
    this._postMessage("seek", scene.starttime);
  }

  _postMessage(action, param) {
    if (action === "seek" && param === undefined) {
      param = parseInt(this.state.seekTime, 10);
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
      case "nextScene":
        this.goToScene(this._getNextScene());
        break;
      case "firstScene":
        this.goToScene(this.state.scenes[0]);
        break;
    }
  }

  // _handleSeekTime(evt) {
  //   this.setState({ seekTime: evt.target.value });
  // }

  _connectHBOWindow(isAuto) {
    if (!this.targetWindow) {
      // Attempt to connect to an existing window
      this.targetWindow = window.open(
        undefined,
        "WIC-HBOWindow",
        "width=800,height=600");
      this.connectionState = isAuto ? "AUTOCONNECTING" : "RECONNECTING";
      window.addEventListener("message", this._receiveMessage.bind(this));
    }
    // Ping for a response, see if a target window exists
    this._startHandshake();
  }

  _launchHBOWindow() {
    console.log("Target window is not at HBO, reloading");
    this.targetWindow = window.open(
      hboUri + "/episode/" + this._getCurrentEpisode().hboid + "?autoplay=true",
      "WIC-HBOWindow",
      "width=800,height=600");
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
      } else {
        console.log(" - Existing window does not exist or did not respond.");
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
        { /*
        <div className="player" style={{width:"800px", height:"400px", backgroundColor:"black"}}>
          <object id="ifp" data="ifphls.swf" type="application/x-shockwave-flash" width="100%" height="100%">
            <param name="FlashVars" value="videoId=1920&amp;loadVideo=http%3A%2F%2Fhls3.pro11.lv3.cdn.hbogo.com%2Fvideos%2FPRO11%2Fgov2%2Fe5%2Fhbo%2Ffeature%2F634424%2F263255_820888e59fb76b1172e7a649d35dcc7d%2Fhbo_263255_820888e59fb76b1172e7a649d35dcc7d_PRO11%2Fbase_index_c9_14_access.m3u8&amp;setDRMToken=BtOuhn3VIEVd" />
            <param name="FlashVars" value="videoId=1879&amp;loadVideo=http%3A%2F%2Fpdl.misc.lv3.hbogo.com%2Fpreroll%2Fv2%2Fhbo%2FPRO11%2Fhbo_12796940_PRO11%2Fbase_index_c8_14.m3u8&amp;setFallbackUri=http%3A%2F%2Fhls3.pro11.lv3.cdn.hbogo.com%2Fvideos%2FPRO11%2Fgov2%2Fe5%2Fhbo%2Ffeature%2F634424%2F263255_820888e59fb76b1172e7a649d35dcc7d%2Fhbo_263255_820888e59fb76b1172e7a649d35dcc7d_PRO11%2Fbase_index_c9_14_access.m3u8%2C&amp;setDRMToken=Yxy6f0CnpyaD" />
            <param name="FlashVars" value="videoId=7388&amp;loadVideo=http%3A%2F%2Fhls3.pro11.lv3.cdn.hbogo.com%2Fvideos%2FPRO11%2Fgov2%2Fe5%2Fhbo%2Ffeature%2F634424%2F263255_820888e59fb76b1172e7a649d35dcc7d%2Fhbo_263255_820888e59fb76b1172e7a649d35dcc7d_PRO11%2Fbase_index_c9_14_access.m3u8&amp;setDRMToken=BjF0gxr2fT4J" />
            <param name="quality" value="high" />
            <param name="bgcolor" value="#000000" />
            <param name="wmode" value="transparent" />
            <param name="allowscriptaccess" value="always" />
            <param name="allowfullscreen" value="true" />
            <param name="play" value="true" />
          </object>
        </div>
        */ }
        <div id="PlayerControlSection" style={{ position: "absolute", top: 0, left: 0, textAlign: "left"}}>
          { /* <button onClick={this._connectHBOWindow.bind(this)}>Launch HBO</button> */ }
          <br/><br/>
          <button onClick={(__e) => this._handleNav("firstScene")}>&lt;&lt; Start from Beginning</button>
          <button onClick={(__e) => this._handlePlay()}>{this.state.isPlaying ? "Pause" : "Play"}</button>
          <button onClick={(__e) => this._handleNav("nextScene")} enabled={(!!this.state.nextScene).toString()}>Next Scene &gt;</button>
          <br/><br/>
          {/*
            <input type="number" value={this.state.seekTime} onChange={this._handleSeekTime.bind(this)} />
            <button onClick={(__e) => this._postMessage("seek")}>Seek</button>
          */}
        </div>
        { /* <WICPlayer /> */ }
        <WICEpisodeList episodes={this.state.episodes} currentScene={this.state.currentScene} onScenePlay={this.goToScene.bind(this)}/>
        <WICFilterAutoComplete />
        <WICFilterContainer filters={this._filters} onFilterChange={this._handleFilterChange.bind(this)}/>
        <div id="StatusSection">
          <div>{this.state.connection}</div>
          <div>{this.state.currentPosition}</div>
        </div>
      </div>
    );
  }
}

export default App;
