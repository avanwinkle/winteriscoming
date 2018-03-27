import SpreadsheetEntry from "./SpreadsheetEntry";
import Utils from "./Utils";

const GOT_SERIES_URN = "urn:hbo:series:GVU2cggagzYNJjhsJATwo";

const hurleyToken = new Promise((resolve, reject) => {
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
      resolve(response.access_token);
    }, (reason) => {
      reject(reason);
    }
  );
});

const _generateCometRequest = function(body) {
  return new Promise((resolve, reject) => {
    hurleyToken.then((access_token) => {
      // For the first request get the series URN, subsequent requests use an episode urn
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
      }).then((res) => res.json()).then(
        (response) => { resolve(response); },
        (reason) => { reject(reason); }
      );
    });
  });
};

class EpisodeMapBase {
  constructor() {
    this.episodes = [];
    this._episodesById = {};
    this._onReady = [];
    this._fetchAttempts = 0;

    fetch(
      "https://spreadsheets.google.com/feeds/list/1iSeYTRX2h7IJHLIa0oFuKirI3SxsXQkqoMkFsv5Aer4/2/public/values?alt=json#gid=984213785"
    ).then((res) => res.json()).then((result) => {
      this._fetchMetadataForEpisodes(result).then(() => {
        this._onReady.forEach((callbackFn) => {
          callbackFn.apply(null, [this.episodes]);
        });
        this._onReady = undefined;
      });
    });
      
  }

  getEpisode(epid) {
    if (!this._episodesById[epid]) {
      console.warn("Unable to retrieve episode ", epid);
    }
    return this._episodesById[epid];
  }

  _fetchMetadataForEpisodes(episodeEntries) {
    // Store all the episodes we require metadata for
    var requiredEpisodes = [];
    var episodesByUrn = {};
    episodeEntries.feed.entry.forEach((episodeEntry) => {
      var ep = new Episode(episodeEntry);
      this.episodes.push(ep);
      this._episodesById[ep.id] = ep;
      requiredEpisodes.push(ep.hboid);
      episodesByUrn[ep.hboid] = ep;
    });
    this.episodes.sort((a, b) => a.id - b.id);

    var episodeBatches = [];
    while (requiredEpisodes.length > 32) {
      episodeBatches.push(this.fetchEpisodeMetadata(requiredEpisodes.splice(0, 32)));
    }
    episodeBatches.push(this.fetchEpisodeMetadata(requiredEpisodes));

    return Promise.all(episodeBatches).then((cometBatchResponses) => {
      cometBatchResponses.forEach((cometResponse) => {
        cometResponse.forEach((metadata) => {
          // Edit for a viewable?
          if (metadata.id.indexOf("urn:hbo:edit") === 0 && episodesByUrn[metadata.body.references.viewable]) {
            var editEpisode = episodesByUrn[metadata.body.references.viewable];
            editEpisode.edits.push(metadata.body);
            if (metadata.body.quality === "HD" && metadata.body.language === "en-US" && metadata.body.audio === "5.1 Surround") {
              editEpisode.videoUrn = metadata.body.references.video;
            }
          }
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
          // Apply other attributes from metadata
          episode.duration = metadata.body.duration;
          episode.title = metadata.body.titles.full;
        });
      });

      // If we have episodes that haven't been populated yet, fetch them
      var missingEpisodes = this.episodes.filter((ep) => ep.images.tile === undefined).map((ep) => ep.hboid);
      if (missingEpisodes.length) {
        this._fetchAttempts++;
        if (this._fetchAttempts > 5) {
          console.warn("Too many attempts to fetch!");
          return;
        } else {
          console.log("Found " + missingEpisodes.length + " episodes without metadata, fetching more...", missingEpisodes);
          return this.fetchEpisodeMetadata(missingEpisodes);
        }
      } else {
        console.log("Fetching episodes complete!");
      }
    });
  }


  fetchEpisodeMetadata(episode_urns) {
    var body = episode_urns ? episode_urns.map((urn) => ({"id": urn})) : [{"id": GOT_SERIES_URN}];
    return _generateCometRequest(body);
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
    this.id = (this.seasonnum * 100) + this.episodenum;
    this.scenes = [];
    this.edits = [];
    this.images = {};
  }
}

var EpisodeMap = new EpisodeMapBase();
export default EpisodeMap;
