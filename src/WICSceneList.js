import React, { Component } from "react";

class SceneList extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    console.log(props);
  }

  render() {
    var scenes = this.props.scenes.map((scene) => (
      <div key={scene.id}>{scene.description}</div>
    ));

    return (
      <div className="SceneListContainer">
        {scenes}
      </div>
    );
  }
}

export default SceneList;