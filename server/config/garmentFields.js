/* Measurement field keys matched to the shop's physical bill-book layout.
   Labels are in English per the shop's request; keys stay stable for storage. */
module.exports = {
  trouser: {
    tableKeys: ['length', 'waist', 'hip', 'thigh', 'calf', 'bottom'],
    tableLabels: { length: 'Length', waist: 'Waist', hip: 'Hip', thigh: 'Thigh', calf: 'Calf', bottom: 'Bottom' },
    leftKeys: ['designNo', 'fitting', 'pocket', 'backPocket'],
    rightKeys: ['belt', 'plate', 'bottomFold'],
    labels: {
      designNo: 'Design No', fitting: 'Fitting', pocket: 'Pocket', backPocket: 'Back Pocket',
      belt: 'Belt', plate: 'Plate', bottomFold: 'Bottom',
    },
  },
  shirtCoat: {
    tableKeys: ['length', 'tira', 'chest', 'waist', 'collarSize', 'sleeve', 'naturalWaist'],
    tableLabels: {
      length: 'Length', tira: 'Tira', chest: 'Chest', waist: 'Waist',
      collarSize: 'Collar', sleeve: 'Sleeve', naturalWaist: 'Natural Waist',
    },
    leftKeys: ['designNo', 'fitting', 'collarDetail', 'cuff'],
    rightKeys: ['pocket', 'cut', 'plate'],
    labels: {
      designNo: 'Design No', fitting: 'Fitting', collarDetail: 'Collar', cuff: 'Cuff',
      pocket: 'Pocket', cut: 'Cut', plate: 'Plate',
    },
  },
};