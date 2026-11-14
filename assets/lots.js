// ============================================================
// PYRAMIDE DE GAINS — Mister Coque × Arabian Seduct
// 29 lots — total 106 unités
// ============================================================

export const LOT_PYRAMID = [
  { name: 'Casque AirPods Max (couleur au choix)', qty: 1, detail: 'Couleur au choix selon stock disponible.', order: 1 },
  { name: 'AirPods 4', qty: 3, detail: 'Nouvelle génération d’écouteurs Apple.', order: 2 },
  { name: 'AirPods Pro', qty: 3, detail: 'Réduction de bruit active, son immersif.', order: 3 },
  { name: 'Boîtier Officiel Apple', qty: 5, detail: 'Boîtier de recharge officiel Apple.', order: 4 },
  { name: 'Câble USB-C Apple', qty: 5, detail: 'Câble de charge officiel Apple USB-C.', order: 5 },
  { name: 'Câble USB-C vers Lightning Apple', qty: 5, detail: 'Câble de charge officiel Apple.', order: 6 },
  { name: 'Batterie à recharge magnétique', qty: 3, detail: 'Batterie MagSafe compatible.', order: 7 },
  { name: 'Pack découverte (2 films)', qty: 20, detail: 'Film hydrogel matte transparent + film arrière au choix.', order: 8 },
  { name: 'Nettoyage de téléphone offert', qty: 10, detail: 'Nettoyage complet en boutique.', order: 9 },
  { name: 'Coque MagSafe (iPhone) au choix', qty: 10, detail: 'Coque MagSafe pour iPhone, modèle au choix selon stock.', order: 10 },
  { name: 'Billet de 100€', qty: 1, detail: 'Billet de 100€ à retirer en boutique.', order: 11 },
  { name: 'Billet de 20€', qty: 5, detail: 'Billet de 20€ à retirer en boutique.', order: 12 },
  { name: 'Montre Boss homme', qty: 1, detail: 'Montre Boss homme, modèle selon stock.', order: 13 },
  { name: 'Montre Armani femme', qty: 1, detail: 'Montre Armani femme, modèle selon stock.', order: 14 },
  { name: 'Senteur maison Ameerat', qty: 1, detail: 'Senteur maison Ameerat.', order: 15 },
  { name: 'Parfum Sunset Berries', qty: 1, detail: 'Parfum Sunset Berries.', order: 16 },
  { name: 'Summer Crush', qty: 1, detail: 'Parfum Summer Crush.', order: 17 },
  { name: 'Brume Sol de Janeiro', qty: 3, detail: 'Brume Sol de Janeiro.', order: 18 },
  { name: 'Miswak', qty: 2, detail: 'Miswak.', order: 19 },
  { name: 'Anthology', qty: 2, detail: 'Parfum Anthology, senteur au choix selon stock.', order: 20 },
  { name: 'Pack brume Sol', qty: 1, detail: 'Pack brume Sol.', order: 21 },
  { name: 'Brume Coco Vanille', qty: 1, detail: 'Brume Coco Vanille.', order: 22 },
  { name: 'Musk Rose Bonbon', qty: 1, detail: 'Musk Rose Bonbon.', order: 23 },
  { name: 'Diffuseur maison', qty: 1, detail: 'Diffuseur maison.', order: 24 },
  { name: 'Parfum enfant El Nabil', qty: 3, detail: 'Parfum enfant El Nabil.', order: 25 },
  { name: 'Sprays', qty: 12, detail: 'Sprays.', order: 26 },
  { name: 'Bouquet "Your Flower"', qty: 2, detail: 'Bouquet "Your Flower" à retirer en boutique.', order: 27 },
  { name: 'Boîte rose éternel "Your Flower"', qty: 1, detail: 'Boîte rose éternel "Your Flower".', order: 28 },
  { name: 'Paire de Nike Travis Scott', qty: 1, detail: 'Paire de Nike Travis Scott, taille selon stock.', order: 29 },
];

// Lots de secours : tirés UNIQUEMENT quand toute la pyramide est épuisée.
// Pas de quantité limitée (sauf ajout ultérieur d'un paramètre de stock).
export const LOT_FALLBACK = [
  { name: '20% de remise sur prochaine réparation', detail: 'Valable une fois sur une réparation en boutique.' },
  { name: '20% de remise sur prochain achat accessoire', detail: 'Valable une fois sur un accessoire en boutique.' },
  { name: '15% de remise sur prochain achat parfumerie', detail: 'Valable une fois sur un achat parfumerie.' },
];

// Conservée pour compatibilité (plus utilisée dans le tirage, remplacée par LOT_FALLBACK).
export const REMISE_DEFAUT = {
  name: '5% de remise sur toute la boutique',
  detail: "Valable une fois sur l'ensemble de la boutique Mister Coque × Arabian Seduct."
};
