import SpreadsheetEntry from "./SpreadsheetEntry";
import Utils from "./Utils";

const GOT_SERIES_URN = "urn:hbo:series:GVU2cggagzYNJjhsJATwo";

class EpisodeMapBase {
  constructor() {
    this.episodes = [];
    this._episodesById = {};
    this._onReady = [];
    this._fetchAttempts = 0;

    fetch("https://spreadsheets.google.com/feeds/list/1iSeYTRX2h7IJHLIa0oFuKirI3SxsXQkqoMkFsv5Aer4/2/public/values?alt=json#gid=984213785")
      .then(res => res.json()).then(
        (result) => {
          result.feed.entry.forEach((episodeEntry) => {
            var ep = new Episode(episodeEntry);
            this.episodes.push(ep);
            this._episodesById[ep.id] = ep;
          });
          this.episodes.sort((a, b) => a.id - b.id);

          this._onReady.forEach((callbackFn) => {
            callbackFn.apply(null, [this.episodes]);
          });
          this._onReady = undefined;
        }
      );
    console.log(this.episodes);
  }

  getEpisode(epid) {
    return this._episodesById[epid];
  }

  fetchEpisodeMetadata(access_token, episode_urns) {
    return new Promise((resolve, reject) => {
      // For the first request get the series URN, subsequent requests use an episode urn
      var body = episode_urns ? episode_urns.map((urn) => ({"id": urn})) : [{"id": GOT_SERIES_URN}];
      fetch("https://comet.api.hbo.com/content", {
        body: JSON.stringify(body),
        method: "POST",
        headers: {
          accept: "application/vnd.hbo.v8.full+json",
          "authorization": "Bearer " + access_token,
          "content-type": "application/json",
          "x-b3-traceid": "f97447dc-045f-41aa-94f2-8a4aca0154c3-2b6aacbc-80bd-4d63-e554-ca27d3c694f4",
          "x-hbo-client-version": "Hadron/14.1.0.15 desktop (DESKTOP)",
        }
      }).then((res) => res.json()).then((response) => {
        response.forEach((metadata) => {
          // Not an episode of GoT? Ignore it
          if (metadata.id.indexOf("urn:hbo:episode") === -1 || metadata.body.references.series !== GOT_SERIES_URN) { 
            return; 
          }
          // Match this metadata to an episode
          var episode = this._episodesById[metadata.body.seasonNumber * 100 + metadata.body.numberInSeason];
          if (episode === undefined) {
            console.log(metadata.body.seasonNumber + "__" + metadata.body.numberInSeason + "__" + metadata.id + "__" + metadata.body.titles.full + "__" + metadata.body.duration);
            return;
          }

          ["tile", "tilezoom", "background"].forEach((img) => {
            episode.images[img] = metadata.body.images[img]
              .replace("{{size}}","374x210")
              .replace("{{compression}}", "low")
              .replace("{{protection}}", "false")
              .replace("{{scaleDownToFit}}", "false");
          });

          if (episode.duration !== metadata.body.duration) { console.info("Episode " + episode.id + " '" + metadata.body.titles.full + "' needs duration " + metadata.body.duration); }
          
        });

        // If we have episodes that haven't been populated yet, fetch them
        var missingEpisodes = this.episodes.filter((ep) => ep.images.tile === undefined).map((ep) => ep.hboid);
        if (missingEpisodes.length) {
          this._fetchAttempts++;
          if (this._fetchAttempts > 5) {
            console.warn("Too many attempts to fetch!");
            reject();
            return;
          } else {
            console.log("Found " + missingEpisodes.length + " episodes without metadata, fetching more...", missingEpisodes);
            resolve(this.fetchEpisodeMetadata(access_token, missingEpisodes));
          }
        } else {
          console.log("Fetching episodes complete!");
          resolve();
        }
      });

    });
  }

  filterEpisodes(scenes) {
    var episodesRequired = [];
    scenes.forEach((scene) => {
      var ep = this._episodesById[scene.seasonepisode];
      if (ep === undefined) {
        console.warn("Missing Episode object for ep " + scene.seasonepisode);
        return;
      }
      if (episodesRequired.indexOf(ep) === -1) {
        episodesRequired.push(ep);
        ep.scenes = [];
        ep.scenesDuration = 0;
      }
      ep.scenes.push(scene);
      ep.scenesDuration += scene.duration;
      ep.durationString = Utils.durationToString(ep.scenesDuration);
    });
    
    return episodesRequired.sort((a, b) => a.id - b.id);
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

class Episode extends SpreadsheetEntry {
  constructor(episodeEntry) {
    super(episodeEntry);
    this.id = (this.season * 100) + this.episode;
    this.scenes = [];
    this.images = {};
  }
}

var EpisodeMap = new EpisodeMapBase();
export default EpisodeMap;
