// ARCore only recognizes flat images, so a 3D object (ARTarget.is_object) is
// registered with a photo of its placard; clues tell the player to scan that.
export const PLACARD_CLUE = 'This one is a 3D object. Scan its placard to reveal the model!';

export const hasClue = (t) => !!(t && ((t.hint && t.hint.trim().length > 0) || t.is_object));
