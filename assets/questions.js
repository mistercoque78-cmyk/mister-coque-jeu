// ============================================================
// SCHÉMA DU QUESTIONNAIRE (QCM) — partagé front + back
// type: 'multiple' => cases à cocher (plusieurs réponses possibles)
// type: 'single'   => boutons radio (exactement 1 réponse)
// ============================================================

export const QUESTIONS = [
  {
    id: 'sources',
    type: 'multiple',
    required: true,
    label: "Comment avez-vous entendu parler de l'événement ?",
    options: [
      { id: 'social', label: 'Réseaux sociaux', subs: ['TikTok', 'Instagram', 'Snapchat', 'Facebook', 'X / Twitter', 'Autre réseau'] },
      { id: 'word', label: 'Bouche à oreille', subs: ['Famille', 'Amis', 'Collègue'] },
      { id: 'other', label: 'Autre', customText: true }
    ]
  },
  {
    id: 'universes',
    type: 'single',
    required: true,
    label: "Quel univers souhaitiez-vous découvrir ?",
    options: [
      { id: 'mistercoque', label: 'Mister Coque' },
      { id: 'parfumerie', label: 'Parfumerie' },
      { id: 'both', label: 'Les deux univers' }
    ]
  }
];
