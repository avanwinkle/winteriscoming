import Filters from "./Filters";

class SceneMapBase {
  constructor() {
    this.scenes = [];
    fetch("https://spreadsheets.google.com/feeds/list/1iSeYTRX2h7IJHLIa0oFuKirI3SxsXQkqoMkFsv5Aer4/od6/public/values?alt=json")
      .then(res => res.json()).then(
        (result) => {
          console.log("Got some json!", result);
          result.feed.entry.forEach((sceneEntry) => {
            this.scenes.push(new Scene(sceneEntry));
          });
          console.log(this.scenes);
        }, (error) => {
          console.error(error);
        }
      );
  }

  filterScenes(enabledFilters, exclusionFilters, inclusionFilters) {
    console.log(enabledFilters, exclusionFilters, inclusionFilters);
    // No filters? Return everything
    if (enabledFilters.length === 0 && exclusionFilters.length === 0) {
      return this.scenes;
    }

    var sceneList = [];
    this.scenes.forEach((scene) => {
      var matchState = 0;
      // First, try to exclude this scene
      exclusionFilters.forEach((filter) => {
        if (scene.filters.indexOf(filter) !== -1) {
          matchState = -1;
        }
      });
      // Second, try to force include
      inclusionFilters.forEach((filter) => {
        if (scene.filters.indexOf(filter) !== -1) {
          matchState = 1;
        }
      });
      // If the above didn't conclude with anything...
      if (matchState === 0) {
        // Iterate through the enabled filters looking for matches
        enabledFilters.forEach((filter) => {
          // Fastest check: if it's not in any filter or we've matched, skip
          if (matchState !== 0 || scene.filters.indexOf(filter) === -1) {
            return;
          }
          // Otherwise, it's a match
          matchState = 1;
        });
      }
      // If we're only excluding, include each scene if it's not explicitly excluded
      if (enabledFilters.length === 0 && matchState === 0) {
        matchState = 1;
      }
      if (matchState === 1) {
        sceneList.push(scene);
      }
    });
    return sceneList;
  }
}

class Scene  {
  constructor(sceneEntry) {
    for (var property in sceneEntry) {
      if (property.indexOf("gsx$") === 0 && sceneEntry.hasOwnProperty(property)) {
        property = property.replace("gsx$", "");
        this[property] = this._getEntryProperty(property, sceneEntry);
      }
    }
    this.id = (this.season * 10000) + (this.episode * 100) + this.scene;
    this.duration = this.endtime - this.starttime;
    this.filters = this.characters.concat(this.houses, this.locations, this.storylines);
  }

  _getEntryProperty(prop, sceneEntry) {
    var value = sceneEntry["gsx$" + prop]["$t"];

    if (Filters.keys[prop] !== undefined) {
      return value !== "" ? value.split(/, ?/) : [];
    } else if (value.match(/^\d+$/)) {
      return parseInt(value, 10);
    } else {
      return value !== "" ? value : undefined;
    }
  }
}

var SceneMap = new SceneMapBase();
export default SceneMap;