import React, { Component } from "react";
import PlayCircleFilled from "material-ui/svg-icons/av/play-circle-filled";
import "./styles/EpisodeList.css";

class EpisodeList extends Component {
  constructor(props) {
    super(props);
    this.props = props;
  }

  _handleScenePlay(scene) {
    this.props.onScenePlay(scene);
  }

  render() {
    var episodes = this.props.episodes.map((episode) => {
      var episodeState = "Future";
      if (this.props.currentScene) { 
        if (episode.id < this.props.currentScene.seasonepisode) {
          episodeState = "Past";
        } else if (episode.id === this.props.currentScene.seasonepisode) {
          episodeState = "Current";
        }
      }

      return (
        <div key={episode.id} className={"episodeContainer episodeState" + episodeState }>
          <div className="episodeHeader">
            <div className="episodeTile" style={{ backgroundImage: "url('" + episode.images.background + "')" }} />
            <div className="episodeMetadata">
              <div className="episodeNumber">Sn. {episode.season} Ep. {episode.episode}</div>
              <div className="episodeTitle">{episode.title}</div>
              <div className="episodeContent">{episode.scenes.length || "All "} Scenes ({episode.durationString})</div>
            </div>
          </div>
          <div className="episodeSceneListContainer">
            {episode.scenes.map((scene) => {
              var sceneState = "Future";
              if (this.props.currentScene) {
                if (scene.id < this.props.currentScene.id) {
                  sceneState = "Past";
                } else if (scene === this.props.currentScene) {
                  sceneState = "Current";
                }
              }
              return (
                <div key={scene.id} className={"episodeSceneListItem episodeSceneState" + sceneState}>
                  <PlayCircleFilled className="episodeSceneListPlay" 
                    color="#FFFFFF"
                    hoverColor="#3399cc"
                    onClick={(__e) => this._handleScenePlay(scene)} />
                  <div className="episodeSceneListItemName">{scene.description}</div>
                  <div className="episodeSceneListItemDuration">{scene.durationString}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });

    return (
      <div className="EpisodeListContainer">
        {episodes}
      </div>
    );
  }
}

export default EpisodeList;