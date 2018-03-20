import SpreadsheetEntry from "./SpreadsheetEntry";
import Filters from "./Filters";
import Utils from "./Utils";
import EpisodeMap from "./EpisodeMap";

class SceneMapBase {
  constructor() {
    this.scenes = [];
    this._onReady = [];

    fetch("https://spreadsheets.google.com/feeds/list/1iSeYTRX2h7IJHLIa0oFuKirI3SxsXQkqoMkFsv5Aer4/od6/public/values?alt=json")
      .then(res => res.json()).then(
        (result) => {
          EpisodeMap.onReady((__episodes) => {
            this._buildSceneList(result.feed.entry);
          });
        }, (error) => {
          console.error(error);
        }
      );
  }

  _buildSceneList(sceneEntries) {
    sceneEntries.forEach((sceneEntry) => {
      this.scenes.push(new Scene(sceneEntry));
    });
    this._onReady.forEach((callbackFn) => {
      callbackFn.apply(null, [this.scenes]);
    });
    this._onReady = undefined;
  }

  filterScenes(filters) {
    // No filters? Return everything
    if (filters.enabled.length === 0 && filters.excluded.length === 0) {
      return this.scenes;
    }

    var sceneList = [];
    this.scenes.forEach((scene) => {
      var matchState = 0;
      // First, try to exclude this scene
      filters.excluded.forEach((filter) => {
        if (scene.filters.indexOf(filter) !== -1) {
          matchState = -1;
        }
      });
      // Second, try to force include (may override an exclude filter)
      filters.included.forEach((filter) => {
        if (scene.filters.indexOf(filter) !== -1) {
          matchState = 1;
        }
      });
      // If the above didn't conclude with anything...
      if (matchState === 0) {
        // Iterate through the enabled filters looking for matches
        filters.enabled.forEach((filter) => {
          // Fastest check: if it's not in any filter or we've matched, skip
          if (matchState !== 0 || scene.filters.indexOf(filter) === -1) {
            return;
          }
          // Otherwise, it's a match
          matchState = 1;
        });
      }
      // If we're only excluding, include each scene if it's not explicitly excluded
      if (filters.enabled.length === 0 && matchState === 0) {
        matchState = 1;
      }
      if (matchState === 1) {
        sceneList.push(scene);
      }
    });
    return sceneList;
  }

  onReady(callbackFn) {
    // If we have already declared ready?
    if (this._onReady === undefined) {
      callbackFn.apply(null, [this.scenes]);
    } else {
      this._onReady.push(callbackFn);
    }
  }
}

class Scene extends SpreadsheetEntry {
  constructor(sceneEntry) {
    super(sceneEntry);
    this.seasonepisode = this.season * 100 + this.episode;
    this.id = this.seasonepisode * 100 + this.scene;
    
    // Scene times are tracked relative to the end, so calculate start/end points
    var episode = EpisodeMap.getEpisode(this.seasonepisode);
    this.starttime = episode.duration - this.inpointfromend;
    this.endtime = episode.duration - this.outpointfromend;
    this.duration = this.endtime - this.starttime;
    this.durationString = Utils.durationToString(this.duration);
    this.filters = this.characters.concat(this.houses, this.locations, this.storylines);

    // Validate all the filters
    this.filters.forEach((filt) => {
      if (!Filters.get(filt)) {
        console.warn("Unknown filter '" + filt +"' not found in Filters");
      }
    });
  }
}

var SceneMap = new SceneMapBase();
export default SceneMap;