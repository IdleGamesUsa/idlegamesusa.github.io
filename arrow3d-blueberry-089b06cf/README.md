# Arrow Trails 3D · Blueberry

A playable mockup for Pocket Puzzle Club. Original art and code only.
A voxel blueberry (~11 blocks across) is wrapped in neon arrow lines.
Drag to orbit, pinch or wheel to zoom, tap an arrow to slide it off.

## 3D exit rule

Each arrow occupies a sequence of exposed voxel faces and has a single
head direction D, one of the six axis directions. When fired, the whole
arrow — every cell, even if the painted path bends — translates in
direction D and flies off the model.

A face is treated as a thin axis-aligned box: the unit face square
extruded 0.2 units outward along its normal.

An arrow may be fired if and only if no face-box of any other remaining
arrow lies in its flight path:

- Their projections strictly overlap on the two axes perpendicular to D, and
- The other box is completely in front of (or exactly touching) this box along D.

The berry voxels themselves do not block. Only remaining arrows do,
including arrows on the far side or on a protruding stairstep or the
calyx, if they sit in that flight corridor. Firing an already-legal
arrow is always safe: blockers only disappear, so a reverse-constructed
level cannot be bricked.

A blocked tap flashes red and costs a heart (3 hearts).

## Generate and test

```
node generate.js [seed]
node test.js
```

Default seed is 20261121. The level is frozen in `level.js`.
