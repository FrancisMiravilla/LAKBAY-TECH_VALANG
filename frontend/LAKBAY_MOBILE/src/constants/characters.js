// Character id (CustomUser.chosen_character) → display name and portrait.
export const getCharacterDetails = (charId) => {
  const id = String(charId || '').toLowerCase().trim();
  switch (id) {
    case 'mando': return { name: 'Kuya Mando',    image: require('../assets/characters/lila.jpg'),  zoom: 1.15 };
    case 'bela':  return { name: 'Ate Bela',       image: require('../assets/characters/new.jpg'),   zoom: 1.15 };
    case 'lila':  return { name: 'Ate Lila',       image: require('../assets/characters/ricky.jpg'), zoom: 1.4  };
    case 'dante': return { name: 'Bossing Dante',  image: require('../assets/characters/dante.jpg'), zoom: 1.4  };
    case 'sonya': return { name: 'Ate Sonya',      image: require('../assets/characters/sonya.jpg'), zoom: 1    };
    default:      return { name: 'Kuya Mando',     image: require('../assets/characters/lila.jpg'),  zoom: 1.15 };
  }
};
