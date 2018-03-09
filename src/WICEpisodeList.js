import React, { Component } from "react";
import "./styles/EpisodeList.css";

class EpisodeList extends Component {
  constructor(props) {
    super(props);
    this.props = props;
  }

  render() {
    var episodes = this.props.episodes.map((episode) => (
      <div key={episode.id} className="episodeContainer">
        <div className="episodeHeader">
          <div className="episodeTile" style={{ backgroundImage: "url('" + episode.images.background + "')" }} />
          <div className="episodeMetadata">
            <div className="episodeNumber">Sn. {episode.season} Ep. {episode.episode}</div>
            <div className="episodeTitle">{episode.title}</div>
            <div className="episodeContent">{episode.scenes.length || "All "} Scenes ({episode.durationString})</div>
          </div>
        </div>

        {episode.scenes.map((scene) => (
          <div key={scene.id}>{scene.description} ({scene.durationString})</div>
        ))}
      </div>
    ));

    return (
      <div className="EpisodeListContainer">
        {episodes}
      </div>
    );
  }
}

export default EpisodeList;