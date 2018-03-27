var Filters = {};

Filters.get = function(id) {
  return Filters._lookup[id];
};

Filters.getAllCategories = function() {
  return ["characters", "houses", "locations", "storylines"];
};

Filters.getAllNames = function() {
  var allNames = [];
  Filters.getAllCategories().forEach((category) => {
    allNames = allNames.concat(Filters[category].map((filt) => filt.name));
  });
  return allNames;
};

Filters.characters = [
  { id: "Arya",     house: "Stark" },
  { id: "Bran",     house: "Stark" },
  { id: "Bronn", },
  { id: "Caetlyn",  house: "Stark" },
  { id: "Cersei",   house: "Lannister" },
  { id: "Danerys",  house: "Targaryen" },
  { id: "Hound",    name: "the Hound" },
  { id: "Jaime",    house: "Lannister" },
  { id: "Jon",      house: "Stark", lastName: "Snow" },
  { id: "Joffrey",  house: "Lannister", lastName: "Baratheon" },
  { id: "Jorah",    house: "Mormont" },
  { id: "Margarey", house: "Tyrell" },
  { id: "Ned",      house: "Stark" },
  { id: "Rob",      house: "Stark" },
  { id: "Robert",   house: "Baratheon" },
  { id: "Sansa",    house: "Stark" },
  { id: "Theon",    house: "Greyjoy" },
  { id: "Tyrion",   house: "Lannister" },
  { id: "Tywin",    house: "Lannister" },
  { id: "Viserys",  house: "Targaryen" },
];

Filters.houses = [
  { id: "Baratheon" },
  { 
    id: "Dothraki",
    name: "the Dothraki",
  },
  { id: "Greyjoy"   },
  { id: "Lannister" },
  { id: "Martell"   },
  { id: "Mormont"   },
  {
    id: "NightsWatch",
    name: "the Nights Watch",
  },
  { id: "Stark"     },
  { id: "Targaryen" },
  { id: "Tyrell"    },
];

Filters.locations = [
  { 
    id: "BeyondTheWall",
    name: "Beyond The Wall",
  },
  {
    id: "CastleBlack",
    name:" Castle Black",
  },
  {
    id: "Dorne",
  },
  {
    id: "Essos",
  },
  { 
    id: "KingsLanding",
    name: "Kings Landing",
  },
  {
    id: "Mereen",
  },
  { 
    id: "North",
    name: "the North",
  },
  {
    id: "RedKeep",
    name: "the Red Keep",
  },
  { id: "Winterfell" },
];

Filters.storylines = [
  {
    id: "Castermere",
    name: "the Rains of Castermere",
    description: "Follow the plots and machinations of Cersei and Tywin Lannister in their unyielding quest for power.",
  },
  {
    id: "FireAndIce",
    name: "A Song of Ice and Fire",
    description: "The journey of Danerys Stormborn and Jon Snow as they cross the world in search of their futures.",
  },
  {
    id: "ThreeEyedRaven",
    name: "the Three-Eyed Raven",
    description: "Follow the story of Bran and his quest to uncover the hidden history of Westeros and the secrets of the Wall.",
  },
  {
    id: "WarOfFiveKings",
    name: "the War Of Five Kings",
    description: "Joffrey, Stannis, Renly, Rob, Euron... who will sit upon the Iron Throne and rule the Seven Kingdoms?",
  },
  {
    id: "WhiteWalkers",
    name: "the White Walkers",
    description: "Winter is coming, and far to the north a great evil rises.",
  },
];

Filters.keys = {};
Filters._lookup = {};

Filters.getAllCategories().forEach((category) => {
  Filters.keys[category] = Filters[category].map((filter) => {
    // Store the type of filter for when we lookup by id
    filter.type = category;
    // If no name is specified, use the id as the name
    filter.name = filter.name || filter.id;
    // For characters, append a house or lastname
    if (category === "characters" && (filter.lastName || filter.house)) {
      filter.name = filter.name + " " + (filter.lastName || filter.house);
    }
    // Store a reference by id for easy lookup
    Filters._lookup[filter.id] = filter;
    return filter.id;
  });
});

console.log(Filters);

export default Filters;