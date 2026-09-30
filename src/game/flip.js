/** A double (or triple) jump is a front flip lasting this long (s). */
export const FLIP_S = 0.5

/** Front-flip angle for flip progress t in [0, 1]: fast start, soft finish. */
export const flipAngle = (t) => (1 - (1 - Math.min(1, t)) ** 3) * Math.PI * 2
