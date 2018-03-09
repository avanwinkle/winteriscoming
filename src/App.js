import React, { Component } from "react";
import SceneMap from "./SceneMap";
import EpisodeMap from "./EpisodeMap";
import WICEpisodeList from "./WICEpisodeList";
import WICFilterAutoComplete from "./WICFilterAutoComplete";
import WICFilterContainer from "./WICFilterContainer";
import WICSceneList from "./WICSceneList";
import "./App.css";

const hboUri = "http://localhost.hadron.aws.hbogo.com:3000";
// const wicUri = "http://localhost.hadron.aws.hbogo.com:4000"

class App extends Component {
  constructor(props) {
    super(props);
    this.targetWindow = undefined;
    this.connectionState = "NOT_CONNECTED";
    
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
      connection: this.connectionState,
    };

    SceneMap.onReady((__scenes) => {
      EpisodeMap.onReady((__episodes) => {
        this._fetchTokenAndEpisodes().then(() => {
          var scenes = SceneMap.filterScenes(this._filters);
          this.setState({ 
            scenes: scenes,
            episodes: EpisodeMap.filterEpisodes(this.state.scenes)
          });
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

  _postMessage(action) {
    var param;
    if (action === "seek") {
      param = parseInt(this.state.seekTime, 10);
    } else if (action === "toggle") {
      action = this.state.isPlaying ? "pause" : "play";
    }

    if (!this.targetWindow) { this._launchHBOWindow(); }

    this.targetWindow.postMessage({
      message: "wic-controlaction",
      action: action,
      param: param,
    }, hboUri);
    console.log(" - POSTED!");
    this.setState({ isPlaying: !this.state.isPlaying });
  }

  _receiveMessage(event) {
    console.log(event);
    if (event.data.message === "handshake_received") {
      console.log("HANDSHAKE!");
      this.connectionState = "CONNECTED";
      this.setState({ connection: this.connectionState });
    }
    if (event.data.message === "position") {
      this.setState({ currentPosition: event.data.value });
    }
  }

  _handleFilterChange() {
    var scenes = SceneMap.filterScenes(this._filters);
    this.setState({ 
      scenes: scenes,
      episodes: EpisodeMap.filterEpisodes(scenes)
    });
  }

  _handleSeekTime(evt) {
    this.setState({ seekTime: evt.target.value });
  }

  _launchHBOWindow() {
    console.log("Launching HBO!");
    this.connectionState = "NOT_CONNECTED";
    
    var episodeId = "GVVD52AFtf8NosSQJAAGb";
    this.targetWindow = window.open(
      hboUri + "/episode/urn:hbo:episode:" + episodeId + "?autoplay=true",
      "WIC-HBOWindow",
      "width=800,height=600");
    window.addEventListener("message", this._receiveMessage.bind(this));
    this.connectionState = "OPENING";
    this._startHandshake();
  }

  _startHandshake() {
    if (!this.targetWindow) {
      console.error("Cannot check handshake without target window");
      return;
    }
    else if (this.connectionState === "OPENING") {
      this.connectionState = "POLLING";
      this.targetWindow.postMessage({ message: "handshake_request" }, hboUri);  
    }
    else if (this.connectionState === "POLLING") {
      console.log("Polling target window for handshake...", this.connectionState);
      this.setState({ connection: this.connectionState });
    }
    else {
      console.log("Inactive connection state '" + this.connectionState + "', cancelling poll.");
      return;
    }
    setTimeout(this._startHandshake.bind(this), 1000);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src="images/got-logo-white.png" alt="logo" style={{ opacity: 0.05 }}/>
        </header>
        {/*
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
        */}
        { /*
        <div id="PlayerControlSection">
          <button onClick={this._launchHBOWindow.bind(this)}>Launch HBO</button>
          <br/><br/>
          <button onClick={(__e) => this._postMessage("toggle")}>{this.state.isPlaying ? "Pause" : "Play"}</button>
          <br/><br/>
          <input type="number" value={this.state.seekTime} onChange={this._handleSeekTime.bind(this)} />
          <button onClick={(__e) => this._postMessage("seek")}>Seek</button>
        </div>
        */ }
        { /* <WICSceneList scenes={this.state.scenes} /> */ }
        <WICEpisodeList episodes={this.state.episodes} />
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
