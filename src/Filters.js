var Filters = {};

Filters.characters = [
  { id: "Arya"    },
  { id: "Bran"    },
  { id: "Caetlyn" },
  { id: "Cersei"  },
  { id: "Jaime"   },
  { id: "Jon"     },
  { id: "Ned"     },
  { id: "Rob"     },
  { id: "Sansa"   },
  { id: "Theon"   },
  { id: "Tyrion"  },
  { id: "Tywin"   },
]

Filters.houses = [
  { id: "Baratheon" },
  { id: "Greyjoy"   },
  { id: "Lannister" },
  { id: "Martell"   },
  { id: "Mormont"   },
  {
    id: "NightsWatch",
    name: "the Nights Watch",
  },
  { id: "Stark"     },
  { id: "Tyrell"    },
];

Filters.locations = [
  { 
    id: "BeyondTheWall",
    name: "Beyond The Wall",
  },
  { 
    id: "KingsLanding",
    name: "Kings Landing",
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
]

Filters.storylines = [
  {
    id: "Castermere",
    name: "Castermere",
    description: "Cersei and Tywin Lannister's unyielding quest for power",
  },
  {
    id: "WarOfFiveKings",
    name: "WarOfFiveKings",
    description: "Joffrey, Stannis, Renly, Rob, Euron... who will rule the Seven Kingdoms?",
  },
  {
    id: "WhiteWalkers",
    name: "WhiteWalkers",
    description: "Winter is coming",
  },
]

Filters.keys = {};
Filters._lookup = {};

["characters", "houses", "locations", "storylines"].forEach((category) => {
  Filters.keys[category] = Filters[category].map((filter) => {
    // Store the type of filter for when we lookup by id
    filter.type = category;
    // If no name is specified, use the id as the name
    filter.name = filter.name || filter.id;
    // Store a reference by id for easy lookup
    Filters._lookup[filter.id] = filter;
    return filter.id;
  });
});

Filters.get = function(id) {
  return Filters._lookup[id];
}

console.log(Filters);

export default Filters;