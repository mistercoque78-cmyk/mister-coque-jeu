// ============================================================
// PYRAMIDE DE GAINS — Mister Coque × Arabian Seduct
// 25 lots — total 97 unités
// ============================================================

export const LOT_PYRAMID = [
  { name: 'AirPods 4', qty: 1, detail: 'Nouvelle génération d’écouteurs Apple.', order: 1 },
  { name: 'AirPods Pro', qty: 1, detail: 'Réduction de bruit active, son immersif.', order: 2 },
  { name: 'Boîtier Officiel Apple', qty: 5, detail: 'Boîtier de recharge officiel Apple.', order: 3 },
  { name: 'Câble USB-C Apple', qty: 5, detail: 'Câble de charge officiel Apple USB-C.', order: 4 },
  { name: 'Câble USB-C vers Lightning Apple', qty: 5, detail: 'Câble de charge officiel Apple.', order: 5 },
  { name: 'Batterie à recharge magnétique', qty: 3, detail: 'Batterie MagSafe compatible.', order: 6 },
  { name: 'Pack découverte (2 films)', qty: 20, detail: 'Film hydrogel matte transparent + film arrière au choix.', order: 7 },
  { name: 'Nettoyage de téléphone offert', qty: 10, detail: 'Nettoyage complet en boutique.', order: 8 },
  { name: 'Coque MagSafe (iPhone) au choix', qty: 10, detail: 'Coque MagSafe pour iPhone, modèle au choix selon stock.', order: 9 },
  { name: 'Billet de 100€', qty: 1, detail: 'Billet de 100€ à retirer en boutique.', order: 10 },
  { name: 'Billet de 20€', qty: 5, detail: 'Billet de 20€ à retirer en boutique.', order: 11 },
  { name: 'Montre Boss homme', qty: 1, detail: 'Montre Boss homme, modèle selon stock.', order: 12 },
  { name: 'Senteur maison Ameerat', qty: 1, detail: 'Senteur maison Ameerat.', order: 13 },
  { name: 'Parfum Sunset Berries', qty: 1, detail: 'Parfum Sunset Berries.', order: 14 },
  { name: 'Summer Crush', qty: 1, detail: 'Parfum Summer Crush.', order: 15 },
  { name: 'Brume Sol de Janeiro', qty: 3, detail: 'Brume Sol de Janeiro.', order: 16 },
  { name: 'Miswak', qty: 2, detail: 'Miswak.', order: 17 },
  { name: 'Anthology', qty: 2, detail: 'Parfum Anthology, senteur au choix selon stock.', order: 18 },
  { name: 'Pack brume Sol', qty: 1, detail: 'Pack brume Sol.', order: 19 },
  { name: 'Brume Coco Vanille', qty: 1, detail: 'Brume Coco Vanille.', order: 20 },
  { name: 'Musk Rose Bonbon', qty: 1, detail: 'Musk Rose Bonbon.', order: 21 },
  { name: 'Diffuseur maison', qty: 1, detail: 'Diffuseur maison.', order: 22 },
  { name: 'Parfum enfant El Nabil', qty: 3, detail: 'Parfum enfant El Nabil.', order: 23 },
  { name: 'Sprays', qty: 12, detail: 'Sprays.', order: 24 },
  { name: 'Paire de Nike Travis Scott', qty: 1, detail: 'Paire de Nike Travis Scott, taille selon stock.', order: 25 },
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
