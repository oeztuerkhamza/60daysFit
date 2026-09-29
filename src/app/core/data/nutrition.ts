/**
 * The eating rules the program runs on: little sugar, few refined carbs, plenty
 * of protein. Kept in code rather than the database — they are guidance, the
 * same for everyone, and belong next to the page that shows them.
 */
export interface NutritionRule {
  title: string;
  detail: string;
}

export const NUTRITION_RULES: readonly NutritionRule[] = [
  {
    title: 'Her öğünde protein',
    detail:
      'Yumurta, tavuk, balık, kırmızı et, yoğurt, peynir, baklagil. Günlük hedef vücut ağırlığının ' +
      'kilogramı başına 1,6–2 gram; 80 kg için yaklaşık 130–160 gram.',
  },
  {
    title: 'Şeker yok',
    detail:
      'Eklenmiş şeker, şekerli içecek, tatlı ve bisküvi yok. Meyveyi günde 1–2 porsiyonla sınırla, ' +
      'meyve suyu yerine meyvenin kendisini ye.',
  },
  {
    title: 'Rafine karbonhidratı azalt',
    detail:
      'Beyaz ekmek, pirinç, makarna, hamur işi ve cips yerine sebze, baklagil ve tam tahıl. ' +
      'Karbonhidratı en çok yürüyüş sonrası öğüne bırak.',
  },
  {
    title: 'Tabağın yarısı sebze',
    detail: 'Hacmi sebzeden al; tok tutar, kalori yükü düşüktür ve lif sindirimi dengeler.',
  },
  {
    title: 'Su',
    detail:
      'Günde en az 2,5 litre. Yürüyüş öncesi ve sonrası birer bardak fazladan iç; ' +
      'uzun yürüyüşlerde yanına su al.',
  },
  {
    title: 'Her öğünün fotoğrafı',
    detail:
      'Yemeden önce fotoğrafını çek ve buraya yükle. Kayıt tutmak, porsiyonu ve şeker kaçamaklarını ' +
      'tahminden çok daha net gösterir.',
  },
];
