const Utils = {
  durationToString: function (duration) {
    duration = parseInt(duration, 10);
    return "" + parseInt(duration / 60, 10) + ":" + ( duration % 60 < 10 ? "0" : "") + (duration % 60);
  }
};

export default Utils;