const fs = require('fs');
const path = require('path');
const uniqid = require('uniqid');

// Inline wordlists for adjectives and animals
const adjectives = [
  'Swift','Silent','Brave','Clever','Mighty','Shadow','Crimson','Iron','Frost','Thunder',
  'Lucky','Wild','Neon','Ghost','Rogue','Vigilant','Quantum','Hyper','Atomic','Zen',
  'Epic','Fierce','Bold','Savage','Mystic','Radiant','Vivid','Dynamic','Cosmic','Ethereal'
];
const animals = [
  'Fox','Wolf','Tiger','Dragon','Falcon','Shark','Eagle','Phoenix','Leopard','Raven',
  'Otter','Hawk','Panther','Badger','Cobra','Stingray','Bull','Griffin','Orca','Wombat',
  'Lynx','Bear','Lion','Cheetah','Owl','Falcon','Shark','Eagle','Phoenix','Raven'
];

function generateNick(isUnique) {
  let nick;
  let attempts = 0;
  do {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(Math.random() * 90) + 10; // random 2-digit number 10-99
    nick = `${adj}${animal}${num}`;
    attempts++;
    if (attempts > 100) throw new Error('Could not generate unique nickname');
  } while (isUnique && !isUnique(nick));
  return nick;
}

function generateBulk(n = 500, isUnique) {
  const set = new Set();
  while (set.size < n) {
    const nick = generateNick(isUnique);
    set.add(nick);
  }
  return Array.from(set);
}

module.exports = { generateNick, generateBulk };


// const fs = require('fs');
// const path = require('path');
// const uniqid = require('uniqid');

// // Load wordlists shipped with this project (we'll create them inline below)
// const adjectives = [
//   'Swift','Silent','Brave','Clever','Mighty','Shadow','Crimson','Iron','Frost','Thunder',
//   'Lucky','Wild','Neon','Ghost','Rogue','Vigilant','Quantum','Hyper','Atomic','Zen'
// ];
// const animals = [
//   'Fox','Wolf','Tiger','Dragon','Falcon','Shark','Eagle','Phoenix','Leopard','Raven',
//   'Otter','Hawk','Panther','Badger','Cobra','Stingray','Bull','Griffin','Orca','Wombat'
// ];

// function generateNick() {
//   const a = adjectives[Math.floor(Math.random() * adjectives.length)];
//   const b = animals[Math.floor(Math.random() * animals.length)];
//   const id = uniqid.time().slice(-4);
//   return `${a}${b}${id}`;
// }

// function generateBulk(n = 500) {
//   const set = new Set();
//   while (set.size < n) set.add(generateNick());
//   return Array.from(set);
// }

// module.exports = { generateNick, generateBulk };
